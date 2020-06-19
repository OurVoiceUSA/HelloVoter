import { Router } from 'express';
import plaid from 'plaid';
import stripe from 'stripe';
import {
  _400
} from '../../../lib/utils';
import { ov_config } from '../../../lib/ov_config';

module.exports = Router({mergeParams: true})
.post('/payout/account/token/exchange', async (req, res) => {
  return exchangeToken(req, res);
});

async function exchangeToken(req, res) {
  if (!req.body.token) return _400(res, "Invalid value to parameter 'token'.");
  if (!req.body.account_id) return _400(res, "Invalid value to parameter 'account_id'.");

  var plaidClient = new plaid.Client(
    ov_config.plaid_client_id,
    ov_config.plaid_secret,
    ov_config.plaid_public_key,
    plaid.environments.sandbox,
  );

  plaidClient.exchangePublicToken(req.body.token, function(err, res) {
    if (err != null) {
      return _400(res, err);
    }
    var accessToken = res.access_token;
    // Generate a bank account token
    plaidClient.createStripeToken(accessToken, req.body.account_id, async function(err, res) {
      if (err != null) {
        return _400(res, err);
      }
      var bankAccountToken = res.stripe_bank_account_token;
      const customer = await stripe(ov_config.stripe_secret_key).customers.create({
        source: bankAccountToken,
        email: 'test_user@example.com',
      });
      console.log("customer: " + JSON.stringify(customer));
    });
  });

  return res.json({});
}

