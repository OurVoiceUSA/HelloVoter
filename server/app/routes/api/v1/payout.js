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

  const plaidClient = new plaid.Client(
    ov_config.plaid_client_id,
    ov_config.plaid_secret,
    ov_config.plaid_public_key,
    plaid.environments.sandbox,
  );

  let plaidTokenRes;
  try {
    plaidTokenRes = await plaidClient.exchangePublicToken(req.body.token);
  } catch (err) {
    return _400(res, err);
  }

  const accessToken = plaidTokenRes.access_token;
  // Generate a bank account token
  let stripeTokenRes;
  try {
    stripeTokenRes = await plaidClient.createStripeToken(accessToken, req.body.account_id);
  } catch (err) {
    return _400(res, err);
  }
  
  const bankAccountToken = stripeTokenRes.stripe_bank_account_token;
  let customer;
  try {
    customer = await stripe(ov_config.stripe_secret_key).customers.create({
      source: bankAccountToken,
      email: 'test_user@example.com',
    });
  } catch (err) {
    return _400(res, err);
  }
  console.log("customer: " + JSON.stringify(customer));

  return res.json({});
}

