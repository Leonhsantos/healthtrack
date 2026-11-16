const router = require('express').Router();
const { wrap, periodo } = require('../util');
const { indicadores } = require('../stats');

// RF05, RF06
router.get('/', wrap(async (req, res) => {
  const { inicio, fim } = periodo(req.query);
  res.json(await indicadores(req.user.id, inicio, fim));
}));

module.exports = router;
