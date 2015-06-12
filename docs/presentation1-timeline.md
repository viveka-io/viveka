# Viveka Presentation Timeline

### The problem
* We are moving toward continuous deployment. We need to have more automation testing
* We need to help testers as manual testing will be decreased
* Hard to predict where QAs should test when developers make a change in a common code base
* Multiple brands
* Layout regression is very hard to detect. Let's do it using computers
* There are good tools but there is no complete end to end solution

### What other projects can. Why it is not enough?
* PhantomCSS (Huddle) - PhantomJS only, simple screenshot based diff
* Huxley (Facebook) - PhantomJS only, simple screenshot based diff
* Wraith (BBC) - PhantomJS only, simple screenshot based diff
* Depicted (Google) - PhantomJS only, simple screenshot based diff
* Galen Framework - need to write the layout specifications.

### Our idea
* Complete end to end solution
* Using perceptual diffs
* Diff tool which "understands" the visual difference and is able to create a useful textual and visual diff report
* Able to run based on BDD style feature files

### What is done
* Discussions made
* How we imagine the development process with this tool (explain)
* Diff review tool prototype
* Prototype main server created in Node.js + MongoDB + Docker + Selenium (demo)
    * Create tests
    * Create and manage fingerprints using WebDriver
    * Create diffs
    * Selenium grid. Currently with Firefox and Chrome
* Test page created for prototype server API (demo)
* Test page for testing diffing engine capabilities with different scenarios (demo)
    * Node addition
    * Node removal
    * Node change
    * Layout/position change
    * Margin/padding change
* Everything runs in Docker
* Domain: viveka.io

### Next step
* Problems with diff algorithm
* Enhance the diffing engine to support more diffing scenarios
* Involve testers in diff review tool design and specification
* Get more outside contributors involved. For this we need
    * Create web page
    * Create documentation
    * Reach the teams of already existing tools
