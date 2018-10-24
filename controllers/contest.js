const models = require('../models/index');

module.exports = {
    create: (req, res) => {
        return models.Contest.create({
            contestName: req.body.contestName,
            img: req.body.img,
            url: req.body.url,
            startDate: req.body.startDate,
            endDate: req.body.endDate,
            prize: req.body.prize,
            user: req.body.user
        })
            .then(contest => res.status(201).send(contest))
            .catch(error => res.status(400).send(error));
    },
    list: (req, res) => {
        return models.Contest.findAll({
        })
            .then(contest => res.status(201).send(contest))
            .catch(error => res.status(400).send(error));
    }
}