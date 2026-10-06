#!/bin/sh
# Compiles and runs a tiny program in every language inside the runner image,
# printing compile and run times. CI runs it after each build:
#   docker run --rm -v "$PWD/runner/smoke:/smoke:ro" <image> sh /smoke/run.sh
set -e
work="$(mktemp -d)"
cp /smoke/* "$work"
cd "$work"

ms() { date +%s%3N; }
step() { # name, then the command
  name="$1"; shift
  t0="$(ms)"
  out="$("$@" 2>&1)" || { echo "FAIL $name: $out"; exit 1; }
  echo "$name: $(( $(ms) - t0 )) ms${out:+  -> $out}"
}

step "javascript run" node main.js
step "typescript run" node main.ts
step "python run    " python3 main.py
step "java compile  " javac -d . Main.java
step "java run      " java -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -cp . Main
step "c# compile    " cs-build main.cs
step "c# run        " dotnet main.dll
step "c++ compile   " g++ -std=gnu++20 -O2 -o main_cpp main.cpp
step "c++ run       " ./main_cpp
step "rust compile  " rustc --edition 2024 -O -o main_rs main.rs
step "rust run      " ./main_rs
