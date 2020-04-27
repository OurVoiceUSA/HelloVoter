import { Router } from 'express';
import { _400, _403 } from '../../../../lib/utils';
import mobile from 'is-mobile';

module.exports = Router({mergeParams: true})
/**
 * @swagger
 *
 * /public/invite:
 *   get:
 *     description: Redirect to native mobile endpoint for the given invite
 *     tags:
 *       - public
 *     security:
 *       []
 *     parameters:
 *       - in: query
 *         name: inviteCode
 *         required: true
 *         type: string
 *       - in: query
 *         name: orgId
 *       - in: query
 *         name: server
 *         type: string
 *     responses:
 *       302:
 *         description: Redirect URL
 *
 */
.get('/public/invite', (req, res) => {
 let url = 'https://ourvoiceusa.org/hellovoter/';
 if (mobile({ua:req.get('User-Agent')})) url = 'OurVoiceApp://invite?inviteCode='+req.query.inviteCode+'&'+(req.query.orgId?'orgId='+req.query.orgId:'server='+req.query.server);
 res.redirect(url);
})
