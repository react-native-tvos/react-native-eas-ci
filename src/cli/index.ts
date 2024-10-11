#!/usr/bin/env -S yarn --silent ts-node --transpile-only

// run the CLI with the current process arguments
require(`${__dirname}/cli`).run(process.argv);
