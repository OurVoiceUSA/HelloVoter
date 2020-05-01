// this file is loaded first as part of mocha test execution

// override some settings for mocks to work
process.env['JWT_PUB_KEY'] = "./test/rsa.pub";
process.env['NEO4J_PORT'] = 57687;
process.env['TEST_EXEC'] = true;
