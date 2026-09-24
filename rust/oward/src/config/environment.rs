use serde::Deserialize;

use crate::config::get_env_var;
#[derive(Debug, Deserialize)]
pub enum Environment {
    Prod,
    Stage,
    Dev,
    Test,
}

pub fn read_environment() -> Environment {
    let environment_string = get_env_var("ENVIRONMENT");

    if environment_string.eq_ignore_ascii_case("prod") {
        Environment::Prod
    } else if environment_string.eq_ignore_ascii_case("stage") {
        Environment::Stage
    } else if environment_string.eq_ignore_ascii_case("dev") {
        Environment::Dev
    } else if environment_string.eq_ignore_ascii_case("test") {
        Environment::Test
    } else {
        Environment::Prod
    }
}
