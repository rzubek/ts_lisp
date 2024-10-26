#!/bin/bash

npm install canopy

pushd .

cd $(dirname "$0")
canopy grammar.peg --lang js 

popd
