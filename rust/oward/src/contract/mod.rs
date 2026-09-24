#[cfg(feature = "aws")]
pub mod aws;

use crate::constants::DEFAULT_GAS_BUFFER_PPM;
use alloy::{
    network::{Ethereum, EthereumWallet},
    primitives::{Address, Uint},
    providers::{
        Identity, PendingTransactionBuilder, ProviderBuilder, RootProvider,
        fillers::{
            BlobGasFiller, ChainIdFiller, FillProvider, GasFiller, JoinFill, NonceFiller,
            WalletFiller,
        },
    },
};
use contract_bindings::{
    AgreementFactory, IAgreementERC20::CreateERC20Params, IAgreementERC1155::CreateERC1155Params,
};
use network::NetworkContext;
use ow_wallet_adapter::wallet::OwWallet;
use request::{
    TokenStandard, TokenizationTxInput,
    batch::{ExecutedTokenizationBatch, TokenizationRequestBatch},
};
use std::str::FromStr;

type AgreementFactoryInstanceWithWallet = AgreementFactory::AgreementFactoryInstance<
    FillProvider<
        JoinFill<
            JoinFill<
                Identity,
                JoinFill<GasFiller, JoinFill<BlobGasFiller, JoinFill<NonceFiller, ChainIdFiller>>>,
            >,
            WalletFiller<EthereumWallet>,
        >,
        FillProvider<
            JoinFill<
                Identity,
                JoinFill<GasFiller, JoinFill<BlobGasFiller, JoinFill<NonceFiller, ChainIdFiller>>>,
            >,
            RootProvider,
        >,
    >,
>;

pub struct ContractManager {
    wallet: OwWallet,
}

impl ContractManager {
    pub async fn build(wallet: OwWallet) -> anyhow::Result<Self> {
        Ok(Self { wallet })
    }

    pub async fn send_tokenization_batch(
        &self,
        tokenization_request_batch: &mut TokenizationRequestBatch,
        network: NetworkContext,
    ) -> anyhow::Result<ExecutedTokenizationBatch> {
        let creation_fee = network.try_creation_fee()?;
        let provider = ProviderBuilder::new()
            .wallet(self.wallet.wallet.clone())
            .connect_provider(network.root_provider);

        let contract: AgreementFactoryInstanceWithWallet = AgreementFactory::new(
            Address::from_str(network.network.agreement_factory_address.as_str())?,
            provider,
        );

        let executed_tokenization_batch = match tokenization_request_batch.token_standard {
            TokenStandard::ERC1155 => {
                Self::send_erc1155_tokenization_batch(
                    tokenization_request_batch,
                    contract,
                    creation_fee,
                )
                .await?
            }
            TokenStandard::ERC20 => {
                Self::send_erc20_tokenization_batch(
                    tokenization_request_batch,
                    contract,
                    creation_fee,
                )
                .await?
            }
        };

        Ok(executed_tokenization_batch)
    }

    async fn send_erc20_tokenization_batch(
        tokenization_request_batch: &mut TokenizationRequestBatch,
        contract: AgreementFactoryInstanceWithWallet,
        creation_fee: i64,
    ) -> anyhow::Result<ExecutedTokenizationBatch> {
        let tx_inputs: Vec<CreateERC20Params> = tokenization_request_batch
            .tokenization_requests
            .iter()
            .map(|r| match r.tx_input.clone() {
                TokenizationTxInput::ERC20(i) => i,
                TokenizationTxInput::ERC1155(_) => panic!("ERC1155 request in ERC20 batch"),
            })
            .collect();

        let call = contract
            .createBatchERC20(tx_inputs)
            .value(Uint::<256, 4>::from(
                tokenization_request_batch.calculate_batch_creation_fee(creation_fee)?,
            ));
        let gas_with_buffer = Self::apply_gas_buffer(call.estimate_gas().await?);

        let pending_call = call.gas(gas_with_buffer).send().await?;

        Ok(Self::resolve_pending_tx(tokenization_request_batch, pending_call).await?)
    }

    fn apply_gas_buffer(gas: u64) -> u64 {
        gas + (gas * DEFAULT_GAS_BUFFER_PPM / 1_000_000)
    }

    async fn resolve_pending_tx(
        tokenization_request_batch: &TokenizationRequestBatch,
        pending_call: PendingTransactionBuilder<Ethereum>,
    ) -> anyhow::Result<ExecutedTokenizationBatch> {
        let tx_hash = pending_call.tx_hash().to_string();
        println!("Waiting for tx: {:?}", tx_hash);

        let receipt = pending_call.get_receipt().await?;
        let success = receipt.status();

        if success {
            println!("Transaction successful! {:?}", receipt);
        } else {
            println!("Transaction failed :( {:?}", receipt);
        }
        Ok(ExecutedTokenizationBatch {
            success,
            tx_hash,
            batch: tokenization_request_batch.clone(),
        })
    }

    async fn send_erc1155_tokenization_batch(
        tokenization_request_batch: &mut TokenizationRequestBatch,
        contract: AgreementFactoryInstanceWithWallet,
        creation_fee: i64,
    ) -> anyhow::Result<ExecutedTokenizationBatch> {
        let tx_inputs: Vec<CreateERC1155Params> = tokenization_request_batch
            .tokenization_requests
            .iter()
            .map(|r| match r.tx_input.clone() {
                TokenizationTxInput::ERC1155(i) => i,
                TokenizationTxInput::ERC20(_) => panic!("ERC20 request in ERC1155 batch"),
            })
            .collect();

        let call = contract
            .createBatchERC1155(tx_inputs)
            .value(Uint::<256, 4>::from(
                tokenization_request_batch.calculate_batch_creation_fee(creation_fee)?,
            ));
        let gas_with_buffer = Self::apply_gas_buffer(call.estimate_gas().await?);

        let pending_call = call.gas(gas_with_buffer).send().await?;

        Ok(Self::resolve_pending_tx(tokenization_request_batch, pending_call).await?)
    }
}
