use std::time::{SystemTime, UNIX_EPOCH};

use aa_tx_request::standard::StandardTxRequestBody;
use alloy::sol_types::SolCall;
use anyhow::bail;
use contract_bindings::AgreementFactory;
use network::NetworkContext;
use request::{TokenStandard, TokenizationTxInput, batch::TokenizationRequestBatch};

use crate::constants::DEFAULT_TX_MAX_AGE_SEC;

pub fn build_calldata(
    tokenization_request_batch: &TokenizationRequestBatch,
) -> anyhow::Result<String> {
    let calldata = match tokenization_request_batch.token_standard {
        TokenStandard::ERC1155 => build_erc1155_calldata(tokenization_request_batch)?,
        TokenStandard::ERC20 => build_erc20_calldata(tokenization_request_batch)?,
    };

    Ok(calldata)
}

fn build_erc1155_calldata(
    tokenization_request_batch: &TokenizationRequestBatch,
) -> anyhow::Result<String> {
    let mut contract_inputs = Vec::new();

    for tokenization_request in tokenization_request_batch.tokenization_requests.clone() {
        match tokenization_request.tx_input {
            TokenizationTxInput::ERC1155(tx_input) => contract_inputs.push(tx_input),
            TokenizationTxInput::ERC20(_) => {
                bail!("Expected input for CreateERC1155, got input for CreateERC20")
            }
        };
    }
    let call = AgreementFactory::createBatchERC1155Call {
        input: contract_inputs,
    };

    let calldata = String::from_utf8(call.abi_encode())?;
    Ok(calldata)
}

fn build_erc20_calldata(
    tokenization_request_batch: &TokenizationRequestBatch,
) -> anyhow::Result<String> {
    let mut contract_inputs = Vec::new();

    for tokenization_request in tokenization_request_batch.tokenization_requests.clone() {
        match tokenization_request.tx_input {
            TokenizationTxInput::ERC20(tx_input) => contract_inputs.push(tx_input),
            TokenizationTxInput::ERC1155(_) => {
                bail!("Expected input for CreateERC1155, got input for CreateERC20")
            }
        };
    }

    let call = AgreementFactory::createBatchERC20Call {
        input: contract_inputs,
    };
    let call_bytes = call.abi_encode();
    let calldata = hex::encode(&call_bytes);

    Ok(calldata)
}

pub fn build_aa_tx_request(
    requester_id: &String,
    tokenization_request_batch: &mut TokenizationRequestBatch,
    network: &NetworkContext,
) -> anyhow::Result<StandardTxRequestBody> {
    let calldata = build_calldata(tokenization_request_batch)?;
    let batch_tx_id = tokenization_request_batch.batch_id.clone();

    let aa_tx_request_body = StandardTxRequestBody {
        tx_id: batch_tx_id,
        requester_id: requester_id.clone(),
        chain_id: tokenization_request_batch.chain_id,
        calldata,
        to_address: network.network.agreement_factory_address.clone(),
        value_wei: tokenization_request_batch.try_batch_creation_fee()?,
        deadline_timestamp: get_deadline_timestamp()?,
        pass_value_from_operator_wallet: true,
        use_operator_wallet_id: None,
        metadata: None,
    };
    Ok(aa_tx_request_body)
}

fn get_deadline_timestamp() -> anyhow::Result<i64> {
    let current_timestamp = i64::try_from(
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs(),
    )?;

    let deadline_timestamp = current_timestamp + DEFAULT_TX_MAX_AGE_SEC;

    Ok(deadline_timestamp)
}
