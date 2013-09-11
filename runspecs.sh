#/bind/bash
find -name "*.spec.js" | xargs -l1 jasmine-node --forceexit
