
const detox = require('detox');
const config = require('../package.json').detox;

before(async () => {
  await detox.init(config);
  await device.launchApp({permissions: {notifications: 'YES', location: 'inuse'}});
  await device.setLocation(33.9206633,-118.3304666);
});

after(async () => {
  await detox.cleanup();
});

describe('App smoke', () => {

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

  it('navigate your representatives', async () => {
    await element(by.text('Your Representatives')).tap();
    await expect(element(by.text('Show Representatives by:'))).toBeVisible();
  });

  it('show reps by current location', async () => {
    await element(by.text('Current Location')).tap();
    await expect(element(by.text('U.S. House of Representatives'))).toBeVisible();
  });

  it('tap to change change show reps', async () => {
    await element(by.text('Based on your approximate address. Tap to change.')).tap();
    await expect(element(by.text('Show Representatives by:'))).toBeVisible();
  });

  it('change show reps by home address', async () => {
    await element(by.text('Home Address')).tap();
    await expect(element(by.text('Cancel'))).toBeVisible();
  });

  it('enter home address and search', async () => {
    await element(by.text('Search')).typeText('1 Rocket Rd Haw');
    await element(by.text('1 Rocket Rd Haw')).tapAtPoint({x: 5, y:50});
    await expect(element(by.text('U.S. House of Representatives'))).toBeVisible();
  });

  it('show reps remembered home address', async () => {
    await element(by.text('Back')).tap();
    await element(by.text('Your Representatives')).tap();
    await expect(element(by.text('Based on your home address. Tap to change.'))).toBeVisible();
  });

  it('U.S. Senate PolProfile', async () => {
    await element(by.text('U.S. Senate')).tapAtPoint({x: 250, y:50});
    await expect(element(by.text('United States Senate'))).toBeVisible();
  });

})

