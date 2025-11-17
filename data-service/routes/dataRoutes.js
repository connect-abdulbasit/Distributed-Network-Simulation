const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataController');

router.post('/', dataController.createData);
router.get('/', dataController.getAllData);
router.get('/:key', dataController.getData);
router.put('/:key', dataController.updateData);
router.delete('/:key', dataController.deleteData);

module.exports = router;