use std::str::FromStr;

use alloy::primitives::Address;
use aws_lambda_events::sqs::SqsEvent;
use lambda_runtime::LambdaEvent;
use request::TokenizationRequest;

pub fn parse_tokenization_requests(
    event: LambdaEvent<SqsEvent>,
) -> anyhow::Result<Vec<TokenizationRequest>> {
    let mut parsed = Vec::new();

    for sqs_message in &event.payload.records {
        let Some(message_body) = sqs_message.body.clone() else {
            println!("SQS message with empty body: {:?}", sqs_message);
            continue;
        };

        let tokenization_request = match TokenizationRequest::from_string(message_body) {
            Ok(r) => r,
            Err(err) => {
                println!(
                    "Invalid tokenization request: {:?}, err: {:?}",
                    sqs_message, err
                );
                continue;
            }
        };

        parsed.push(tokenization_request);
    }

    Ok(parsed)
}

pub fn strings_to_addresses(input: &Vec<String>) -> Vec<Address> {
    input
        .iter()
        .map(|addr_string| {
            Address::from_str(addr_string).expect("Failed to parse address in other_submitters")
        })
        .collect()
}
