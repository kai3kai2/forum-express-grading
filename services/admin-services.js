const { Restaurant, Category } = require('../models')

const adminServices = {
  getRestaurants: (req, cb) => {
    Restaurant.findAll({
      // 將撈出來的資料從sequelize打包形式簡化成要用到的那些資訊
      raw: true,
      nest: true,
      include: [Category]
    })
      .then(restaurants => cb(null, { restaurants }))
      .catch(err => cb(err))
  },
  deleteRestaurant: (req, cb) => {
    const { id } = req.params
    return Restaurant.findByPk(id)
      .then(restaurant => {
        if (!restaurant) {
          const err = new Error('Restaurant did not exists!')
          err.status = 404
          throw err
        }
        return restaurant.destroy()
      })
      .then(deleteRestaurant => cb(null, { restaurant: deleteRestaurant }))
      .catch(err => cb(err))
  }
}

module.exports = adminServices
