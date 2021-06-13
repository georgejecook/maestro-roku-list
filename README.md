# maestro-roku-roku

Lists on roku, without the headache and heartbreak

## About

This lists solves a myriad of problems I've faced on roku, building top tier channels, and complex architectures at applicaster, smithsonian and other places. It is built specifically to facilitate an experience similar to netflix, with a simple programming model.
I totally reinvented the way lists work on roku, purposefully eschewing the paradigms the platforms uses, in lieu of programming models that are familiar to non-roku programmers and much easier to work with.

## Features

 - Hyper-performant, with highly customizable performance
   - Choose how many rows/cells you want to precache
   - Specify the strategy for row/cell reuse
   - So you can choose if you want to keep ram low and be lazy with instantiation, or instantiate up front (maybe while loading data), so the list is snappy and smooth from the get go
   - Performs better than any roku list control, on all devices tested (even roku se1)
   - CPU usage is less than roku rowlists in all tests, even with rich animations, and many delegate callbacks
 - Reuses cells aggressively
   - Reuses cells across whole app, meaning if you wish, you can just use a few hundred cells across various screens
   - In native comparisons, roku's rowlists end up using 1,000's of cells compared to a few hundred for maestro-roku-list
 - Use any renderer, anywhere
   - No more one itemComponent for a whole list hell:
   - Use different renderers in different rows
   - And even in different cells
 - Use custom renderers for rows
   - Can be any content you wish
   - Mix regular components with rows (e.g. buttons, posters, video, etc)
   - All Sub-components of maestro-roku-list get focus, so you can code as you normally would for custom rows (e.g. have buttons that get/lose focus, get keypresses, etc)
 - Custom focus indicator settings, per row:
   - Choose if a row has focus indicator: underneath, onTop, or none at all
   - Can change focus color, per row
   - Change image per row,
   - Can provide offsets to in/out set focus rectangle
 - Easy to write custom cells
   - Extend a base nodeclass, and override onContentChange method
 - Super rich, easy to use callbacks for facilitating whatever choreography you wish
   - No more variables to observe
   - Simply extend `ml_BaseRow` for a custom Row, or `ml_BaseCell` and implement any of the delegate methods (`onWillLoseFocus`, `onLosingFocus`, `onDidGainFocus`, `onWillExit`, `onDidExit`, `onScrollingChange`, `onScrollingUpdate`)
   - All delegate callbacks provide info for fraction of animnation, and direction
   - Event mechanism is super efficient
   - Can listen to events on the whole list, by simply calling `ml.delegateMixin.setListDelegate(myList)`
     - list delegate methods work for rows, cells and the list, providing callbacks like:
     - `onRowLosingFocus(rowIndex as integer, direction as integer, fraction as float)`
     - `onItemSelected(rowIndex as integer, itemIndex as integer)`
     - `onCellWillGainFocus(rowIndex as integer, itemIndex as integer, direction as integer)`
 - Get renderers for any row or cell
  - `row = m.list@.getRowRenderer(rowIndex)`
  - `cell = m.list@.getCellRenderer(rowIndex, cellIndex)`
  - `cell = row@.getRenderer(index)`
 - Get screen rectangle position for any cell:
   - `getRowScreenRect(rowIndex, cellIndex)`
   - `getCellScreenRect(rowIndex, cellIndex)`
 - Rows can easily be show/hidden made focusable/unfocusable:
   - Simply change `isFocusEnabled` and `isHidden` values on the row's content
 - Simple data model
 - No more guessing/wrestling with arrays, maestro-roku-list has models for:
   - `ListContent`
     - has `ListSettings`, `RowSettings` and `FocusSettings` which are replied to whole ist
   - `RowContent`
     - has `RowSettings` which can be tailored to specific row, allowing overriding of
   - `RowSettings` specify:
     - height of the row,
     - spacing,
     - *exact location on screen* when scrolled to
     - Row renderer, - can be any component you wish that extends `ml_BaseRow`
     - and additional settings:
       - `HeaderSettings` - font, insets, background style, color, and even custom header component
       - `FocusSettings` - focus animation style, placement, colors, image uri
       - `CellSettings` - specify the cell size, space, exact screen position when scrolled to
 - Debug in RALE
   -  no more headaches, everything in a maestro-roku-list is in your ScenGraph
   -  you have full control!


## Overview

(Full docs coming soon); but it's pretty much like this:

1. make some content:

```
    function setListContent()
    m.cellSettings = ml.listMixin.createCellSettings("ml_SimpleCell", [480, 320], 30)
    m.rowSettings = ml.listMixin.createRowSettings(m.cellSettings, invalid, 30)
    m.focusSettings = ml.listMixin.createFocusSettings(.5, .1)
    listSettings = ml.listMixin.createListSettings()
    m.list.content = ml.listMixin.createListContent(m.createData(), m.focusSettings, m.rowSettings, listSettings)
    end function

  private function createData()
    content = []
    for i = 0 to m.numberOfRows - 1
      row = createObject("roSGNode", "ml_RowContent")
      row.title = "some title"
      row.appendChildren(m.makeItems(m.defaultCellType, 20))
    end for
  end function
```
2. Respond to delegate events on your list

```
  ml.delegateMixin.setListDelegate(m.list)
```

```
'++ list delegate
  '+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

  private function onCellWillGainFocus(rowIndex as integer, itemIndex as integer, direction as integer)
    ' ? "+SCREEN onCellWillGainFocus : R: "; rowIndex ; " I: " ; itemIndex; " D:" ; direction
  end function

  private function onCellDidGainFocus(rowIndex as integer, itemIndex as integer, direction as integer)
    ' ? "+SCREEN onCellDidGainFocus : R: "; rowIndex ; " I: " ; itemIndex; " D:" ; direction
  end function


  private function onCellDidLoseFocus(rowIndex as integer, itemIndex as integer, direction as integer)
    ' ? "+SCREEN onCellDidLoseFocus : R: "; rowIndex ; " I: " ; itemIndex; " D:" ; direction
  end function

  private function onRowDidGainFocus(rowIndex as integer, direction as integer)
    ' ? "+SCREEN onRowDidGainFocus : R: "; rowIndex ; " D:" ; direction
    row = m.list@.getRowRenderer(rowIndex)
  end function
```
