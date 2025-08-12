#!/bin/bash

# Ensure public_html exists and is empty
rm -rf public_html/
mkdir public_html

npm run build:prod