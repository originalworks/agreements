use crate::config::{ConfigFilePaths, NetworkConfigFilePaths};

pub const DEFAULT_TX_MAX_AGE_SEC: i64 = 3600;
pub const CONFIG_TOML_FILE_PATH: &str = "config.toml";
pub const INPUT_FILE_PATH: &str = "input.json";
pub const CONFIG_FILE_PATHS: ConfigFilePaths = ConfigFilePaths {
    networks: NetworkConfigFilePaths {
        prod: "config/networks/prod.toml",
        stage: "config/networks/stage.toml",
        dev: "config/networks/dev.toml",
        test: "config/networks/test.toml",
    },
    indexers: "config/indexers.toml",
    validation: "config/validation.toml",
};
pub const DEFAULT_GAS_BUFFER_PPM: u64 = 500_00;
