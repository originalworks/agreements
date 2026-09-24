use alloy::sol;
use serde::{Deserialize, Serialize};

sol!(
    #[derive(Debug, Deserialize, Serialize)]
    #[allow(missing_docs)]
    #[sol(rpc)]
    AgreementFactory,
    "../../contracts/artifacts/contracts/agreements/AgreementFactory.sol/AgreementFactory.json"
);

sol!(
    #[derive(Debug, Deserialize, Serialize)]
    #[allow(missing_docs)]
    #[sol(rpc)]
    FeeManager,
    "../../contracts/artifacts/contracts/FeeManager.sol/FeeManager.json"
);
