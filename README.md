Absinthe
========

Ἀψίνθιον. A highly integrated, advanced and cluster-ready server.

*Absinthe* is a pure and beautiful boilerplate to kickstart web-app development. *Absinthe* is released under non-restrictive conditions and is extremely extensible. It is an abstraction of some of our core technologies and may be considered mature. It sports in-flight compression (gzip, deflate), stream caching and a hilarious performance.

Installation
------------

    As the HTTP port is below 1234, Absinthe has to be run with root-priviliges.

  Clone *Absinthe*, setup using `npm install` and you're ready to go. *Absinthe* is appropriate as a static server if you plan to only deliver plain websites; fill up `/static` with your content and go crazy. If you plan on extending *Absinthe* according to your needs, read on.

Architecture
------------

**controller** [kəntrolər]. Extensions which serve data and may include logic routines.   
**logic** [lɑdʒɪk]. Extensions which do not serve data and exclusively contain logic routines.

We've included an example *controller* and an example *logic*. If you fire up the server right now and head to "/start" you'll be greeted by some sweet *Hello World!* sugar. This is served by a *controller* referencing a routine inside a *logic*.

![Structure](https://s3.amazonaws.com/f.cl.ly/items/033w101I102c353U3y3R/Untitled-1.png)

When you fire up *Absinthe*, it searches for both controllers under `/controllers` and logic under `/logic`.

**チャレンジして失敗ことを恐れるよりも、何もしないことを恐れろ。**
