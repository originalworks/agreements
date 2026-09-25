## Available binaries

### CLI

Works as a command line interface for tokenization requests. It reads tokenization request from a JSON file and executes it.

### AWS Lambda worker with the OW Account Abstraction Layer integration

Requires OW Account Abstraction Layer to be deployed and configured.

## Input example

Example of a input for tokenization request. Can be sent as SQS message to the AWS Lambda worker or can be used as JSON file input for the CLI.

### ERC20 tokenization request example:

```json
{
  "tokenization_id": "0x1234567890abcdef", // self declared, unique identifier for the tokenization request
  "chain_id": 42, // chain must be supported by the OWARD network configuration
  "tx_input": {
    "ERC20": {
      "holders": [
        {
          "balance": 5000,
          "isAdmin": true, // first holder must be an admin
          "account": "0xfb94d40B24Adf14c5Aec3061B42513AaF13009d0"
        },
        {
          "balance": 5000,
          "isAdmin": false,
          "account": "0xAec3061B42513AaF13009d0fb94d40B24Adf14c5"
        }
      ],
      "unassignedRwaId": "AB6G67464646"
    }
  }
}
```

### ERC1155 tokenization request example:

```json
{
  "tokenization_id": "0x1234567890abcdef",
  "chain_id": 42,
  "tx_input": {
    "ERC1155": {
      "holders": [
        {
          "balance": 10000,
          "isAdmin": true,
          "account": "0xfb94d40B24Adf14c5Aec3061B42513AaF13009d0"
        }
      ],
      "tokenUri": "https or ipfs link",
      "contractURI": "https or ipfs link",
      "unassignedRwaId": "AB1234567890"
    }
  }
}
```
