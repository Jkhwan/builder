
/**
 * Dependencies
 */

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
var join = require('path').join
var mkdirp = require('mkdirp')

/*!
 * Is this the real life? Or just development?
 */

var dev = process.env.NODE_ENV === 'development'

/**
 * Returns an Express middleware
 *
 * Example:
 *
 *     // hit /app/app.js to get the compiled app
 *     app
 *       .use('/app', builder({out:'build', path:'app'}))
 *       .use('/app', static('build'))
 *
 * Options:
 *
 *     out     ('./build') output directory
 *     root    ('.')       path to component.json
 *     path    ('app')     filename for compiled css and js
 *
 * The options object is also passed
 * directly to the builder and plugins:
 *
 * - [component-builder2](https://github.com/component/builder2.js)
 * - [builder-stylus](https://github.com/retsly/builder-stylus)
 * - [builder-jade](https://github.com/component/builder-jade)
 *
 * @param  {Object} opts
 * @return {Function}
 */
exports = module.exports = function (opts) {
  var builder = new Builder(opts)
  var building = false
  var built = false
  return function (req, res, next) {
    // only build once in production and don't jump the queue
    if (built || building) return process.nextTick(next)

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
 * @param {Object} opts
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
    path: 'app',
  }, opts)
}

/**
 * Resolve dependencies and build application.
 * Writes out to `this.out`. `cb` is called
 * when done or an error is encountered.
 *
 * @param {Function} done callback
 */

Builder.prototype.build = function (cb) {
  var self = this
  this.resolve(function (err, tree) {
    if (err) return cb(err)

    mkdirp(this.out)

    parallel([
      self.files.bind(self, tree),
      self.scripts.bind(self, tree),
      self.styles.bind(self, tree)
    ], cb)
  })
}

/**
 * Resolve dependencies one at a time
 * @api private
 */

Builder.prototype.resolve = function (done) {
  var root = this.root
  var out = join(root, 'components')
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
  var path = join(this.out, this.opts.path) + '.js'
  var alias = this.opts.alias
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

      // add correct aliases based on node name (as in component.json)
      if (alias) {
        for (var key in tree.dependencies) {
          var dep = tree.dependencies[key]
          var name = dep.name.split('/')[1]
          var nodeName = dep.node.name

          if (name == nodeName) continue

          debug('adding alias for js (%s -> %s)', nodeName, name)

          var str = 'require.modules["{nodeName}"] = require.modules["{name}"];\n'
            .replace('{nodeName}', nodeName)
            .replace('{name}', name)
          buf+= str
        }
      }

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
  var path = join(this.out, this.opts.path) + '.css'
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
