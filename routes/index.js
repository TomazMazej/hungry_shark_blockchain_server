var express = require('express');
var router = express.Router();
let blockController = require('../controllers/blockController.js');

/* SHOW */
router.get('/', blockController.list);
router.get('/users/coins/:id',blockController.get_coin);
router.get('/users/skins/:id',blockController.get_skins);

/* CHANGE */
router.post('/receive', blockController.give_coin);
router.post('/buy', blockController.give_skin);

module.exports = router;
