const userServices = require('../../services/user-services')
const { User, Comment, Restaurant, Favorite, Like, Followship, Sequelize } = require('../../models')
const { getUser } = require('../../helpers/auth-helpers')
const { imgurFileHander } = require('../../helpers/file-helpers')

const userController = {
  signUpPage: (req, res) => {
    res.render('signup')
  },
  signUp: (req, res, next) => {
    userServices.signUp(req, (err, data) => {
      if (err) return next(err)

      req.flash('success_messages', 'Success fo SignUp!')
      res.redirect('/signin')
    })
  },
  singInPage: (req, res) => {
    res.render('signin')
  },
  signIn: (req, res) => {
    req.flash('success_messages', 'success for Sign In!')
    res.redirect('/restaurants')
  },
  logout: (req, res) => {
    req.flash('success_messages', 'success for Logout!')
    req.logout()
    res.redirect('/signin')
  },
  getUser: async (req, res, next) => {
    const userId = req.params.id
    try {
      const userData = await User.findByPk(userId, {
        include: [
          { model: Restaurant, as: 'FavoritedRestaurants', attributes: ['id', 'img'] },
          { model: User, as: 'Followings', attributes: ['id', 'image'] },
          { model: User, as: 'Followers', attributes: ['id', 'image'] }
        ]
      })
      if (!userData) throw new Error('No about this user result!')
      const comments = await Comment.findAll({
        where: { userId },
        include: [{ model: Restaurant, attributes: ['id', 'img'] }],
        attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('restaurant_id')), 'restaurantId']],
        nest: true,
        raw: true
      })
      const user = {
        ...userData.toJSON(),
        isFollowed: req.user.Followings.some(following => following.id === userId)
      }
      res.render('users/profile', { user, comments })
    } catch (err) {
      next(err)
    }
  },
  editUser: (req, res, next) => {
    const { id } = req.params
    if (getUser(req).id !== Number(id)) throw new Error('只能編輯自己的頁面喔!')

    return User.findByPk(id, { raw: true })
      .then(user => {
        if (!user) throw new Error('User did not exist!')

        res.render('users/edit', { user })
      })
  },
  putUser: (req, res, next) => {
    const { id } = req.params
    const { name } = req.body

    if (!name) throw new Error('Name is required!')

    const { file } = req

    return Promise.all([
      User.findByPk(id),
      imgurFileHander(file)
    ])
      .then(([user, filePath]) => {
        if (!user) throw new Error('User did not exist!')

        user.update({
          name,
          image: filePath || user.image
        })
      })
      .then(user => {
        req.flash('success_messages', '使用者資料編輯成功')
        res.redirect(`/users/${id}`)
      })
      .catch(err => next(err))
  },
  addFavorite: (req, res, next) => {
    const { restaurantId } = req.params
    return Promise.all([
      Restaurant.findByPk(restaurantId),
      Favorite.findOne({
        where: {
          userId: req.user.id,
          restaurantId
        }
      })
    ])
      .then(([restaurant, favorite]) => {
        if (!restaurant) throw new Error('Restaurant did not exist!')
        if (favorite) throw new Error('You have not favorited this restaurant!')
        return Favorite.create({
          userId: req.user.id,
          restaurantId
        })
      })
      .then(() => res.redirect('back'))
      .catch(err => next(err))
  },
  removeFavorite: (req, res, next) => {
    return Favorite.findOne({
      where: {
        userId: req.user.id,
        restaurantId: req.params.restaurantId
      }
    })
      .then(favorite => {
        if (!favorite) throw new Error('You have not favorited this restaurant!')

        return favorite.destroy()
      })
      .then(() => res.redirect('back'))
      .catch(err => next(err))
  },
  addLike: (req, res, next) => {
    const { restaurantId } = req.params
    return Promise.all([
      Restaurant.findByPk(restaurantId),
      Like.findOne({
        where: {
          userId: req.user.id,
          restaurantId
        }
      })
    ])
      .then(([restaurant, like]) => {
        if (!restaurant) throw new Error('Restaurant did not exist!')
        if (like) throw new Error('You have not like this restaurant')

        return Like.create({
          userId: req.user.id,
          restaurantId
        })
      })
      .then(() => res.redirect('back'))
      .catch(err => next(err))
  },
  removeLike: (req, res, next) => {
    return Like.findOne({
      where: {
        userId: req.user.id,
        restaurantId: req.params.restaurantId
      }
    })
      .then(like => {
        if (!like) throw new Error('You have not like this restaurant.')

        return like.destroy()
      })
      .then(() => res.redirect('back'))
      .catch(err => next(err))
  },
  getTopUsers: (req, res, next) => {
    return User.findAll({
      include: [{ model: User, as: 'Followers' }]
    })
      .then(users => {
        users = users.map(user => ({
          ...user.toJSON(),
          followerCount: user.Followers.length,
          isFollowed: req.user.Followings.some(f => f.id === user.id)
        }))
        users = users.sort((a, b) => b.followerCount - a.followerCount)
        res.render('top-users', { users })
      })
  },
  addFollowing: (req, res, next) => {
    const { userId } = req.params
    Promise.all([
      User.findByPk(userId),
      Followship.findOne({
        where: {
          followerId: req.user.id,
          followingId: userId
        }
      })
    ])
      .then(([user, followship]) => {
        if (!user) throw new Error('User did not exist!')
        if (followship) throw new Error('You are already following this user!')
        return Followship.create({
          followerId: req.user.id,
          followingId: req.params.userId
        })
      })
      .then(() => res.redirect('back'))
      .catch(err => next(err))
  },
  removeFollowing: (req, res, next) => {
    const { userId } = req.params
    return Followship.findOne({
      where: {
        followerId: req.user.id,
        followingId: userId
      }
    })
      .then(followship => {
        if (!followship) throw new Error('You have not followed this user!')
        return followship.destroy()
      })
      .then(() => res.redirect('back'))
      .catch(err => next(err))
  }

}

module.exports = userController
