(function ($, Drupal) {
    Drupal.behaviors.tabledragBricks = {
        attach: function (context, settings) {

            if (Drupal.tableDrag) {

                /**
                 * Pointer movement handler, bound to document.
                 *
                 * @param {jQuery.Event} event
                 *   The pointer event.
                 * @param {Drupal.tableDrag} self
                 *   The tableDrag instance.
                 *
                 * @return {bool|undefined}
                 *   Undefined if no dragObject is defined, false otherwise.
                 */
                Drupal.tableDrag.prototype.dragRow = function (event, self) {
                    if (self.dragObject) {
                        self.currentPointerCoords = self.pointerCoords(event);
                        var y = self.currentPointerCoords.y - self.dragObject.initOffset.y;
                        var x = self.currentPointerCoords.x - self.dragObject.initOffset.x;
                        var swapCommand = [];
                        var indentCommand = [];
                        var validated = true;

                        // Check for row swapping and vertical scrolling.
                        if (y !== self.oldY) {
                            self.rowObject.direction = y > self.oldY ? 'down' : 'up';
                            // Update the old value.
                            self.oldY = y;
                            // Check if the window should be scrolled (and how fast).
                            var scrollAmount = self.checkScroll(self.currentPointerCoords.y);
                            // Stop any current scrolling.
                            clearInterval(self.scrollInterval);
                            // Continue scrolling if the mouse has moved in the scroll direction.
                            if (scrollAmount > 0 && self.rowObject.direction === 'down' || scrollAmount < 0 && self.rowObject.direction === 'up') {
                                self.setScroll(scrollAmount);
                            }

                            // If we have a valid target, perform the swap and restripe the table.
                            var currentRow = self.findDropTargetRow(x, y);
                            if (currentRow) {
                                if (self.rowObject.direction === 'down') {
                                    swapCommand = ['after', currentRow, self];
                                }
                                else {
                                    swapCommand = ['before', currentRow, self];
                                }
                                if (self.striping === true) {
                                    self.restripeTable();
                                }
                            }
                        }

                        // Similar to row swapping, handle indentations.
                        if (self.indentEnabled) {
                            var xDiff = self.currentPointerCoords.x - self.dragObject.indentPointerPos.x;
                            // Set the number of indentations the pointer has been moved left or
                            // right.
                            var indentDiff = Math.round(xDiff / self.indentAmount);
                            // Indent the row with our estimated diff, which may be further
                            // restricted according to the rows around this row.
                            indentCommand = [indentDiff];
                        }

                        if (swapCommand.length || indentCommand.length) {
                            var changes = {};

                            if (swapCommand.length) {
                                var a = self.rowObject.element;
                                var b = swapCommand[1];
                                changes.swap = {
                                    a: a,
                                    b: b
                                }
                            }

                            if (indentCommand.length) {
                                changes.indent = {
                                    row: self.rowObject.element,
                                    indentDiff: indentCommand[0]
                                }
                            }

                            Drupal.tableDrag.setParents(self.table, changes);
                            validated = Drupal.tableDrag.validateHierarchy(self.table);
                        }

                        if (swapCommand.length && validated) {
                            self.rowObject.swap.apply(self.rowObject, swapCommand);
                        }

                        if (indentCommand.length && validated) {
                            var indentChange = self.rowObject.indent.apply(self.rowObject, indentCommand);
                            // Update table and pointer indentations.
                            self.dragObject.indentPointerPos.x += self.indentAmount * indentChange * self.rtl;
                            self.indentCount = Math.max(self.indentCount, self.rowObject.indents);
                        }

                        return false;
                    }
                };

                Drupal.tableDrag.setParents = function (table, changes) {
                    var previousDepths = {};

                    // Add _parent to each row.
                    $('tbody tr', table).each(function (index, row) {
                        var previousRow = $(row).prev('tr')[0];
                        var previousIndents = $('.js-indentation', previousRow).length;
                        var currentIndents = $('.js-indentation', row).length;
                        row._indents = currentIndents;

                        // Simulation for indent change, with the indentDiff.
                        if (changes && changes.indent && changes.indent.indentDiff) {
                            if (previousRow === changes.indent.row) {
                                previousIndents = previousIndents + changes.indent.indentDiff;
                            }

                            else if (row === changes.indent.row) {
                                currentIndents = currentIndents + changes.indent.indentDiff;
                            }
                        }

                        // Simulation for swapping.
                        if (changes && changes.swap) {
                            if (previousRow === changes.swap.a) {
                                previousRow = changes.swap.b;
                            }

                            else if (row === changes.swap.a) {
                                row = changes.swap.b;
                            }
                        }

                        if (!previousRow) {
                            row._parent = null;
                        }
                        else if (currentIndents === previousIndents + 1) {
                            row._parent = previousRow;
                        }
                        else if (currentIndents === previousIndents) {
                            row._parent = previousRow._parent;
                        }
                        else if (currentIndents < previousIndents) {
                            row._parent = previousDepths[currentIndents - 1];
                        }

                        previousDepths[currentIndents] = row;
                    });
                };

                Drupal.tableDrag.validateHierarchy = function (table) {
                    var validated = true;

                    $('tbody tr', table).each(function (index, row) {
                        if (row._parent) {
                            if ($.inArray(row._parent.dataset.bundle, settings.bricks.nesting[row.dataset.bundle]) === -1) {
                                validated = false;
                                return false;
                            }
                        }
                        else if (row._indents) {
                            validated = false;
                            return false;
                        }
                    });

                    return validated;
                };

                /**
                 * Find all siblings for a row.
                 *
                 * According to its subgroup or indentation. Note that the passed-in row is
                 * included in the list of siblings.
                 *
                 * @param {object} rowSettings
                 *   The field settings we're using to identify what constitutes a sibling.
                 *
                 * @return {Array}
                 *   An array of siblings.
                 */
                var findSiblings = Drupal.tableDrag.prototype.row.prototype.findSiblings;
                Drupal.tableDrag.prototype.row.prototype.findSiblings = function (rowSettings) {
                    if (rowSettings.relationship === 'all') {
                        var siblings = [];
                        var directions = ['prev', 'next'];
                        for (var d = 0; d < directions.length; d++) {
                            var checkRow = $(this.element)[directions[d]]();
                            while (checkRow.length) {
                                // Check that the sibling contains a similar target field.
                                if ($('.' + rowSettings.target, checkRow)) {
                                    siblings.push(checkRow[0]);
                                }
                                else {
                                    break;
                                }
                                checkRow = $(checkRow)[directions[d]]();
                            }
                            // Since siblings are added in reverse order for previous, reverse the
                            // completed list of previous siblings. Add the current row and continue.
                            if (directions[d] === 'prev') {
                                siblings.reverse();
                                siblings.push(this.element);
                            }
                        }
                        return siblings;
                    }
                    else {
                        return findSiblings.apply(this, arguments);
                    }
                };
            }

        }
    };
})(jQuery, Drupal);
