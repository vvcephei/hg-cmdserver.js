# General

This is a Node.js interface to the Mercurial command server
(http://mercurial.selenic.com/wiki/CommandServer). I wrote it because I needed
a JS api for mercurial, and I didn't find any lying around. 

I have _not_ been very rigorous about this implementation. In many cases, it's
a direct translation of the reference implementation
(http://mercurial.selenic.com/wiki/PythonHglib). This means that I have not
taken the time to read the actual Mercurial code to verify that my code 
captures all cases. This is especially relevant for code that parses hg
output into JSON. I wrote enough to handle the output I saw in my use cases.
Is this bad practice? yes. Is this version 0.0? yes. Nuff said. See the
roadmap if you want to see how this will change over time.

If the current version (in package.json) is 0.0.x,
then, the implementation is not complete. Like I said, I wrote this code to
make other code possible, so I only bothered to implement the hg commands
that I really needed. I do plan to finish up the interface in the future,
but I'm publishing the incomplete module now since I've found it useful
and you might too.

If I am missing a command you need, feel free to implement it and send me
a pull request, or just ask me to implement it. They aren't hard, just a little
tedious.

See LICENSE for license information. If you don't like what you see,
contact me, and I'll consider your request.

# Roadmap

* 0.0.x     : I'm still working on implementing all the mercurial commands.
* 0.x (x>0) : Then, I'll work on verifying my implementation WRT the mercurial
            implementation. When this is done, that means that I have convinced
            myself that this program works correctly for anything you do with
            mercurial.

* I'm reserving the right to change the interface at any time in version 0 and
  subsequently between major versions.

# Style

I'm sorry if my javascript style is crap and/or a heterogeneous mix of
different styles. I'm working on it, but I'm also busy. If you have some
suggestions, I'd be glad to hear them.

* Installation

This module is published as an npm package, so you can install it all the
ways you install npm packages, including

```bash
$ npm install hg-cmdserver
```

If you like dev versions, just clone this repo and link directly to it in your
program:

```javascript
var hg = require('hg-cmdserver');
```

* Testing

I use nodeunit. To run the tests, just install nodeunit and then run

```bash
$ nodeunit test
```
