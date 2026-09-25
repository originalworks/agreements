use aa_sqs_queue::queue::SqsQueue;
use aws_lambda_events::sqs::{SqsEvent, SqsMessage};
use aws_sdk_sqs::types::QueueAttributeName;
use lambda_runtime::{Context, LambdaEvent};

pub trait BuildForTest {
    fn build_for_test(body: &String, message_id: Option<String>) -> SqsMessage;
}

impl BuildForTest for SqsMessage {
    fn build_for_test(body: &String, message_id: Option<String>) -> SqsMessage {
        let mut sqs_message = SqsMessage::default();
        sqs_message.body = Some(body.clone());
        sqs_message.message_id = message_id;
        sqs_message
    }
}

pub fn build_lambda_sqs_event(messages: Vec<SqsMessage>) -> anyhow::Result<LambdaEvent<SqsEvent>> {
    let mut sqs_event = SqsEvent::default();
    for message in messages {
        sqs_event.records.push(message);
    }
    let event = LambdaEvent::<SqsEvent>::new(sqs_event, Context::default());

    Ok(event)
}

pub async fn create_queue_if_not_exist(
    sqs_client: &aws_sdk_sqs::Client,
    queue_name: String,
    message_group_id: String,
) -> anyhow::Result<SqsQueue> {
    println!("1111111");
    match sqs_client
        .get_queue_url()
        .queue_name(queue_name.clone())
        .send()
        .await
    {
        Ok(resp) => {
            return Ok(SqsQueue {
                queue_url: resp.queue_url.unwrap(),
                client: sqs_client.clone(),
                message_group_id,
            });
        }

        Err(err) => {
            println!("jednak error: {:?}", err);

            let create_queue_response = sqs_client
                .create_queue()
                .queue_name(queue_name)
                .attributes(QueueAttributeName::FifoQueue, "true")
                .attributes(QueueAttributeName::ContentBasedDeduplication, "true")
                .send()
                .await?;
            println!("response: {:?}", create_queue_response);
            let queue_url = create_queue_response.queue_url.unwrap();

            return Ok(SqsQueue {
                queue_url,
                client: sqs_client.clone(),
                message_group_id,
            });
        }
    }
}
