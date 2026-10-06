# syntax=docker/dockerfile:1
#
# The runner image: every compiler the judge uses, booted by Vercel Sandbox for
# each job (docs/notes/decisions.md §5) and used locally by problems:check.
# Built and pushed to Vercel Container Registry by .github/workflows/runner-image.yml.
#
# Versions are pinned; a toolchain upgrade is a change to this file, and the
# label in convex/judge/languages/<language>.ts must follow it.

FROM ubuntu:26.04

ENV LANG=C.UTF-8
ARG DEBIAN_FRONTEND=noninteractive

# Python 3.14, Java 25, .NET 10 and GCC 15 are Ubuntu 26.04's own packages.
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
      ca-certificates \
      curl \
      xz-utils \
      libatomic1 \
      python3.14 \
      python-is-python3 \
      g++ \
      openjdk-25-jdk-headless \
      dotnet-sdk-10.0 && \
    rm -rf /var/lib/apt/lists/*

# Node.js 24, also the runtime for TypeScript (Node strips the types itself).
ARG NODE_VERSION=24.21.0
RUN curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" \
      | tar -xJ --strip-components=1 -C /usr/local \
        --exclude CHANGELOG.md --exclude LICENSE --exclude README.md && \
    rm -rf /usr/local/include/node /usr/local/share/doc

# Rust: just rustc and the standard library (no cargo; solutions are one file
# with no crates). GCC above is its linker.
ARG RUST_VERSION=1.99.0
ENV RUSTUP_HOME=/opt/rustup CARGO_HOME=/opt/cargo
RUN curl -fsSL https://sh.rustup.rs | sh -s -- -y --no-modify-path \
      --profile minimal --default-toolchain "${RUST_VERSION}" && \
    { /opt/cargo/bin/rustup component remove cargo || true; } && \
    ln -s "$(/opt/cargo/bin/rustup which rustc)" /usr/local/bin/rustc && \
    rm -rf /opt/rustup/downloads /opt/rustup/tmp /opt/rustup/toolchains/*/share/doc

# C#: compiled with Roslyn directly by bin/cs-build (see the script). Here we
# record where the compiler is, its options with every reference assembly,
# and the runtimeconfig each program needs.
ENV DOTNET_CLI_TELEMETRY_OPTOUT=1 \
    DOTNET_NOLOGO=1 \
    DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1 \
    DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1
COPY --chmod=0755 bin/cs-build /usr/local/bin/cs-build
RUN mkdir -p /opt/cs && \
    csc="$(ls -d /usr/lib/dotnet/sdk/*/Roslyn/bincore/csc.dll | head -n1)" && \
    refs="$(ls -d /usr/lib/dotnet/packs/Microsoft.NETCore.App.Ref/*/ref/net10.0 | head -n1)" && \
    runtime="$(ls /usr/lib/dotnet/shared/Microsoft.NETCore.App | head -n1)" && \
    test -f "$csc" && test -d "$refs" && test -n "$runtime" && \
    printf '%s' "$csc" > /opt/cs/csc-path && \
    { printf '%s\n' -nologo -nostdlib -noconfig -optimize+ -langversion:latest -nullable:disable -target:exe; \
      ls "$refs"/*.dll | sed 's/^/-r:/'; } > /opt/cs/csc.rsp && \
    printf '{"runtimeOptions":{"tfm":"net10.0","framework":{"name":"Microsoft.NETCore.App","version":"%s"}}}' "$runtime" \
      > /opt/cs/runtimeconfig.json

# C++: precompile <bits/stdc++.h> next to the header, so a solution that
# includes it compiles in a fraction of the time. GCC only uses the .gch
# when the flags match, so these must stay equal to the C++ compile command.
RUN header="$(ls /usr/include/x86_64-linux-gnu/c++/*/bits/stdc++.h | head -n1)" && \
    g++ -std=gnu++20 -O2 -x c++-header "$header" -o "$header.gch"

# Same layout as Vercel's managed images: an unprivileged `ubuntu` user (no
# sudo here: the image runs untrusted code) with its home in /vercel.
RUN install -d -o ubuntu -g ubuntu /vercel && usermod --home /vercel ubuntu
ENV HOME=/vercel SHELL=/bin/bash
USER ubuntu
WORKDIR /vercel

RUN node --version && \
    python --version | grep -F "Python 3.14." && \
    javac --version && java --version && \
    dotnet --list-runtimes && \
    g++ --version && \
    rustc --version
