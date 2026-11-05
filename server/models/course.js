const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
    return sequelize.define('Course', {
        code: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true // Course codes like CS120 should not duplicate
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false
        },
        credits: {
          type: DataTypes.FLOAT,
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true
        }
    })
}