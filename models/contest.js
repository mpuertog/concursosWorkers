'use strict';
module.exports = (sequelize, DataTypes) => {
  const Contest = sequelize.define('Contest', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
    contestName: { type: DataTypes.STRING, allowNull: false },
    img: { type: DataTypes.STRING, allowNull: false },
    url: { type: DataTypes.STRING, allowNull: false },
    startDate: { type: DataTypes.DATE, allowNull: false },
    endDate: { type: DataTypes.DATE, allowNull: false },
    prize: { type: DataTypes.STRING, allowNull: false },
    user: { type: DataTypes.STRING, allowNull: false }
  }, {});
  Contest.associate = function (models) {
    // associations can be defined here
  };
  return Contest;
};