FROM ubuntu:24.04

RUN apt-get update && apt install curl build-essential -y

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:$PATH"

