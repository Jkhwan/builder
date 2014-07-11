
var debug = require('debug')('retsly:build')
var Component = require('component-builder')
var Resolve = require('component-resolver')
var stylus = require('builder-stylus')
var extend = require('extend-object')
var jade = require('builder-jade')
var parse = require('url').parse
var bytes = require('bytes')
var parallel = require('nimble').parallel
var write = require('fs').writeFileSync
var plugins = Component.plugins

/**
 * Is the real life? Or just development?
 */

var dev = process.env.NODE_ENV === 'development'

/**
 * Middleware
 */

exports = module.exports = function (opts) {
  var builder = new Builder(opts)
  var building = false
  var built = false
  return function (req, res, next) {
    // only build once in production
    if (built) return next()
    if (building) return next()

    building = true

    // resolve and build
    builder.build(function(err){
      if (!dev) built = true
      building = false
      next(err)
    })
  }
}

/**
 * Expose Builder
 */

exports.Builder = Builder

/**
 * Component builder
 */

function Builder (opts) {
  opts = opts || {}

  // we delete from opts for stylus' sake
  this.root = opts.root || process.cwd()
  this.out = opts.out || process.cwd() + '/build'
  delete opts.root
  delete opts.out

  // defaults
  this.opts = extend({
    install: true,
    require: true,
    runtime: true,
    string: false,
    linenos: dev,
    destination: this.out,
    path: '/app',
  }, opts)
}

/**
 * Build
 */

Builder.prototype.build = function (done) {
  var self = this
  this.resolve(function (err, tree) {
    if (err) return done(err)

    parallel([
      self.files.bind(self, tree),
      self.scripts.bind(self, tree),
      self.styles.bind(self, tree)
    ], done)
  })
}

/**
 * Resolve dependencies one at a time
 * @api private
 */

Builder.prototype.resolve = function (done) {
  var root = this.root
  var out = root + '/components'
  var start = Date.now()
  var self = this

  if (!dev && this.tree) return done(null, this.tree)

  Resolve(root, {install:true, out:out}, function (err, tree) {
    debug('resolved deps in %dms', Date.now() - start)
    done(err, tree)
  })
}

/**
 * Build files
 * @api private
 */

Builder.prototype.files = function (tree, done) {
  // TODO locate this
  // // only build once in production
  // if (!dev && builtFiles) return done()

  var start = Date.now()
  Component
    .files(tree, this.opts)
    .use('images', plugins.copy())
    .use('fonts', plugins.copy())
    .use('files', plugins.copy())
    .end(function(err) {
      debug('built files in %dms', Date.now() - start)
      done(err)
    })
}

/**
 * Build scripts
 * @api private
 */

Builder.prototype.scripts = function (tree, done) {
  var path = this.out + this.opts.path + '.js'
  var start = Date.now()
  var opts = this.opts
  Component
    .scripts(tree, opts)
    .use('templates', jade(opts))
    .use('templates', plugins.string(opts))
    .use('scripts', plugins.js(opts))
    .use('json', plugins.json(opts))
    .end(function(err, js) {
      if (err) return done(err)

      // TODO minify!

      // add require and jade runtime to the built JS
      var buf = Component.scripts.require + jade.runtime + js
      write(path, buf)
      debug('built js in %dms (%s)', Date.now() - start, bytes(buf.length))
      done()
    })
}

/**
 * Build styles
 * @api private
 */

Builder.prototype.styles = function (tree, done) {
  var path = this.out + this.opts.path + '.css'
  var start = Date.now()
  var opts = this.opts
  Component
    .styles(tree, opts)
    .use('styles', stylus(opts))
    .use('styles', plugins.urlRewriter(opts.prefix || ''))
    .end(function (err, css) {
      write(path, css)
      debug('built css in %dms (%s)', Date.now() - start, bytes(css.length))
      done()
    })
}
