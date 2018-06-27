
const detox = require('detox');
const config = require('../package.json').detox;

before(async () => {
  await detox.init(config);
  await device.launchApp({permissions: {notifications: 'YES', location: 'inuse'}});
});

after(async () => {
  await detox.cleanup();
});

describe('Example', () => {

  it('should have about button', async () => {
    await expect(element(by.text('About Our Voice'))).toBeVisible();
  });
  
  it('navigate about our voice', async () => {
    await element(by.text('About Our Voice')).tap();
    await expect(element(by.text('Who We Are'))).toBeVisible();
  });

  it('navigate back from about to homescreen', async () => {
    await element(by.text('Back')).tap();
    await expect(element(by.text('About Our Voice'))).toBeVisible();
  });

})

