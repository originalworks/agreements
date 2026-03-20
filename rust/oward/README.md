Example of JSON input for tokenization request:

```json
{
  "token_standard": "ERC20",
  "isrc": "ABC123",
  "chain_id": 42,
  "holders": [
    {
      "balance": 5000,
      "is_admin": true, // first holder MUST be an admin
      "account": "0xfeeddeafbeeffeeddeafbeeffeeddeafbeefdead"
    },
    {
      "balance": 5000,
      "is_admin": false,
      "account": "0x1234567890123456789012345678901234567890"
    }
  ]
}
```
