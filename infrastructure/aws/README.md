### How to deploy to AWS

## Prequisites

### Original Works Account Abstraction Layer

This tokenization infrastracture serves as an extension for OW Account Abstraction Layer [https://github.com/originalworks/account-abstraction]. You need to deploy and configure it first.

### Database

The same database instance as for OW Account Abstraction Layer should be used. Additionally, Tokenization Layer should have its own namespace created before running migrations: `tokenization`.
Edit in `samconfig.toml`:

- `DatabaseAccessSecurityGroup` - security group ID that allows access to your database. Use the same as in your Account Abstraction Layer.
- `PrivateSubnets` - private subnets IDs that allow access to your database. One or more subnets can be specified, separated by commas.

**Important:** These are `AWS::SSM::Parameter::Value<String>` parameters type stored in AWS SSM Parameter Store.

**Note:** You can use simple String parameters instead of SSM parameters, just edit the `template.yaml` file and change the parameters type to `String`.

### Secrets

Template assume the following secrets are set in you AWS Secrets Manager:

For Database (pointed by 'DbSecretsName'):

- `password`
- `username`
- `host`
- `port`

**Note:** You can use one AWS Secrets Manager instance for both

## Deployment steps:

1. Go to `./infrastructure`
2. `./build_workers.sh`
3. `sam deploy --config-env {dev|stage|prod}`
