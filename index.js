
var Resolve = require('component-resolver')
var Builder = require('component-builder')
var stylus = require('builder-stylus')
var debug = require('debug')('retsly:build')
var extend = require('extend-object')
var jade = require('builder-jade')
var parse = require('url').parse
var bytes = require('bytes')
var plugins = Builder.plugins

var dev = process.env.NODE_ENV === 'development'

module.exports = function (opts) {
  // defaults
  opts = extend({
    install: true,
    require: true,
    string:  true,
    runtime: true,
    linenos: dev,
    path: '/app',
  }, opts || {})

  var resolving = false
  var queue = []

  var resolvedTree = false
  var builtFiles = false
  var builtScripts = false
  var builtStyles = false

  var root = opts.rootDir || process.cwd()
  var re = new RegExp('^' + opts.path + '.(js|css)$')

  debug('root is \'%s\'', root)

  return function build(req, res, next) {
    var m = re.exec(parse(req.url).pathname)
    if (!m) return next()

    resolve(function (err, tree) {
      if (err) return next(err)
      files(tree, opts, function(err) {
        if (err) return next(err)
        if (m && m[1] === 'js') return scripts(tree, opts)
        if (m && m[1] === 'css') return styles(tree, opts)
      })
    })

    /**
     * Build files
     */

    function files(tree, opts, done) {
      // only build once in production
      if (!dev && builtFiles) return done()

      var start = Date.now()
      Builder
        .files(tree, opts)
        .use('images', plugins.copy())
        .use('fonts', plugins.copy())
        .use('files', plugins.copy())
        .end(function(err) {
          if (err) return done(err)
          builtFiles = true
          debug('built files in %dms', Date.now() - start)
          done()
        })
    }

    /**
     * Build scripts
     */

    function scripts(tree, opts) {
      // only build once in production
      if (!dev && builtScripts) return done(null, builtScripts)
      // source URLs in development
      opts.sourceURL = dev

      var start = Date.now()
      Builder
        .scripts(tree, opts)
        .use('templates', jade(opts))
        .use('templates', plugins.string(opts))
        .use('scripts', plugins.js(opts))
        .use('json', plugins.json(opts))
        .end(done)

      function done (err, js) {
        if (err) return next(err)

        builtScripts = js
        // add require and jade runtime to the built JS
        // TODO fix retsly/gallery so it doesn't need the runtime
        var send = Builder.scripts.require + jade.runtime + js

        debug('built js in %dms (%s)', Date.now() - start, bytes(send.length))

        if (dev) res.setHeader('Cache-Control', 'private, no-cache')
        res.setHeader('Content-Type', 'application/javascript')
        res.setHeader('Content-Length', Buffer.byteLength(send))
        res.end(send)
      }
    }

    /**
     * Build styles
     */

    function styles(tree, opts) {
      // only build once in production
      if (!dev && builtStyles) return done(null, builtStyles)

      var start = Date.now()
      Builder
        .styles(tree, opts)
        .use('styles', stylus(opts))
        .use('styles', plugins.urlRewriter(opts.prefix || ''))
        .end(done)

      function done (err, css) {
        if (err) return next(err)
        builtStyles = css = css || ''
        debug('built css in %dms (%s)', Date.now() - start, bytes(css.length))

        if (dev) res.setHeader('Cache-Control', 'private, no-cache')
        res.setHeader('Content-Type', 'text/css; charset=utf-8')
        res.setHeader('Content-Length', Buffer.byteLength(css))
        res.end(css)
      }
    }
  }

  /**
   * Resolve dependencies (one at a time)
   */

  function resolve(done) {
    if (!dev && resolvedTree) return done(null, resolvedTree)
    if (resolving) return queue.push(done)

    var out = root + '/components'
    resolving = true

    Resolve(root, {install:true, out:out}, function (err, tree) {
      resolving = false
      resolvedTree = tree
      while (queue.length) queue.shift()(err, tree)
      done(err, tree)
    })
  }
}
