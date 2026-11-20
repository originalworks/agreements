# OWARD

OWARD is the Original Works tokenization tool. It creates on-chain agreements that represent shares associated with a registered asset, such as a sound recording identified by its International Standard Recording Code (ISRC). A tokenization request specifies the target chain, the token standard, and who receives the initial shares and administrative rights.

- **ERC-20** agreements issue fungible shares to the listed holders.
- **ERC-1155** agreements issue shares under token ID `1` and take separate URIs for token and contract metadata.

OWARD groups accepted requests by chain and token standard, then builds calls to the [AgreementFactory](../../contracts/contracts/agreements/AgreementFactory.sol). For each request, the factory creates an agreement, initializes its holders, and emits `AgreementCreated` with the agreement address, token standard, and completed real-world asset (RWA) ID. The factory forms that ID by prepending the transaction sender's registered namespace to `unassignedRwaId`.

## Run the CLI

Build the Solidity artifacts used by the Rust contract bindings, then run the CLI from `rust/oward` so it can find its configuration files.

```sh
cd contracts
npm ci
npx hardhat compile
cd ../rust/oward
```

Create a local `.env` file. Set `ENVIRONMENT` to `dev`, `test`, `stage`, or `prod`. For local signing, set `PRIVATE_KEY`. For AWS KMS signing, set `USE_KMS=true` and `SIGNER_KMS_ID`, and configure AWS credentials with access to the key. The signing wallet needs enough native currency for gas and agreement creation fees.

Fill in the target chain's RPC URL, AgreementFactory address, and FeeManager address in [`config/networks/`](config/networks/). Set the Original Works registry and agreements indexer URLs for your environment in [`config/indexers.toml`](config/indexers.toml).

Save your requests as a JSON array in `input.json`, or pass a different path as the first argument.

```sh
cargo run -p oward --bin cli -- ./input.json
```

The CLI prints validation rejections, submits each accepted batch directly to the configured factory, and waits for the transaction receipt.

## Run the AWS Lambda worker

The `aa_aws_lambda_oward` binary uses the Cargo `aws` feature. It consumes tokenization requests from SQS and hands off blockchain execution to the Original Works Account Abstraction Layer.

The worker loads networks from PostgreSQL and records accepted-for-processing requests and their batches there. It validates the holder list, checks registry submitters, calculates the creation fee for each batch, and sends the transaction request to the Account Abstraction SQS queue. The request status becomes `SUBMITTED` when that handoff succeeds. Check the resulting on-chain receipt or `AgreementCreated` event to confirm creation.

Deployment requires the Account Abstraction Layer, a migrated PostgreSQL database with network records, and an AWS Secrets Manager entry for the database credentials. The [AWS template](../../infrastructure/aws/resources/oward.yml) defines the queues, IAM permissions, and Lambda environment variables. See the [deployment overview](../../infrastructure/aws/README.md) and [database setup](../database/README.md). The [worker build script](../../infrastructure/build_workers.sh) packages the Lambda and its configuration.

**Known limitation.** The Lambda's ERC-1155 path treats binary ABI calldata as UTF-8. If that conversion fails, the worker rejects the batch before queueing it.

## Request format

Send a **JSON array** to the CLI and **one JSON object per SQS message body** to the Lambda. The two objects below can also be wrapped in an array for CLI use. [`input-example.json`](input-example.json) shows the array structure.

| Field | Meaning |
| --- | --- |
| `tokenization_id` | Unique string assigned by the caller. The AWS worker uses it to identify previously stored requests. |
| `chain_id` | Numeric EVM chain ID from the network configuration. |
| `tx_input` | An object with one variant, `ERC20` or `ERC1155`. |
| `holders` | Initial holder accounts, balances in raw token units, and admin flags. Include at least one holder and set `isAdmin` to `true` for the first holder. |
| `unassignedRwaId` | Asset identifier before the factory adds a namespace. OWARD uses this value as the ISRC for registry lookups. |
| `tokenUri` and `contractURI` | ERC-1155 token and contract metadata URIs. Field names are case-sensitive. |

Replace the example chain, ISRCs, addresses, and metadata URIs with values for your deployment. OWARD requires a matching DDEX submitter in the Original Works registry for each ISRC. The CLI checks its signing wallet, and the Lambda checks the target network's transaction executor. [`config/validation.toml`](config/validation.toml) can allow additional submitters. Set `ignore_existing_agreements = false` to reject ISRCs already found by the agreements indexer. The checked-in configuration skips that check.

### ERC-20 example

```json
{
  "tokenization_id": "example-erc20-001",
  "chain_id": 100,
  "tx_input": {
    "ERC20": {
      "unassignedRwaId": "USABC2400001",
      "holders": [
        {
          "account": "0x1111111111111111111111111111111111111111",
          "balance": "0x1388",
          "isAdmin": true
        },
        {
          "account": "0x2222222222222222222222222222222222222222",
          "balance": "0x1388",
          "isAdmin": false
        }
      ]
    }
  }
}
```

### ERC-1155 example

```json
{
  "tokenization_id": "example-erc1155-001",
  "chain_id": 100,
  "tx_input": {
    "ERC1155": {
      "unassignedRwaId": "USABC2400002",
      "tokenUri": "https://example.com/metadata/token.json",
      "contractURI": "https://example.com/metadata/contract.json",
      "holders": [
        {
          "account": "0x1111111111111111111111111111111111111111",
          "balance": "0x2710",
          "isAdmin": true
        }
      ]
    }
  }
}
```
