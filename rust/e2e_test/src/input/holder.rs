use alloy::{primitives::U256, signers::local::PrivateKeySigner};
use contract_bindings::IAgreement::Holder;

pub trait CreateRandomHolder {
    fn create_random() -> Holder;
}

impl CreateRandomHolder for Holder {
    fn create_random() -> Holder {
        Holder {
            isAdmin: true,
            balance: U256::from(1000),
            account: PrivateKeySigner::random().address(),
        }
    }
}
