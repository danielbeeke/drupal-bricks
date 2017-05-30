(function ($, Drupal) {
    Drupal.behaviors.tabledragBricks = {
        attach: function (context, settings) {

            if (Drupal.tableDrag) {
                /**
                 * Validates if the current row may be nested inside another row.
                 *
                 * @param {HTMLElement} otherRow
                 *   The row to validate, can be somewhere else in the tree because of dragging around.
                 *
                 * @return {boolean}
                 *   Whether the nesting is valid.
                 */
                Drupal.tableDrag.prototype.row.prototype.mayBeNestedInRow = function(otherRow) {
                    if (!otherRow) { return false; }
                    return $.inArray(otherRow.dataset.bundle, settings.bricks.nesting[this.element.dataset.bundle]) !== -1;
                };


                /**
                 * Validate an indent action, bricks validation specific.
                 *
                 * @param {HTMLElement} prevRow
                 *   The previous row.
                 *
                 * @param {HTMLElement} nextRow
                 *   The next row.
                 *
                 * @param {number} indentDiff
                 *   The number of additional indentations proposed for the row (can be
                 *   positive or negative). This number will be adjusted to nearest valid
                 *   indentation level for the row.
                 *
                 * @return {boolean}
                 *   Whether the indent is valid.
                 */
                Drupal.tableDrag.prototype.row.prototype.validIndent = function (prevRow, nextRow, indentDiff) {
                    var ownRowDepth = this.indents;
                    var prevRowDepth = $(prevRow).find('.js-indentation').length;

                    if (indentDiff > 1 || indentDiff < -1) {
                        return false;
                    }

                    // The dragged row is placed at the same level as the parent.
                    // If the parent has children, then we must not accept.
                    if (ownRowDepth + indentDiff === prevRowDepth) {
                        var parent = this.getHierarchyParent(prevRow);

                        if (!parent) {
                            return true;
                        }

                        return this.mayBeNestedInRow(parent) && !this.hasHierarchyChildren(prevRow);
                    }

                    // The current is being nested under the next one.
                    if (ownRowDepth + indentDiff === prevRowDepth - 1) {
                        return this.mayBeNestedInRow(prevRow);
                    }

                    if (ownRowDepth === prevRowDepth - indentDiff) {
                        return this.mayBeNestedInRow(prevRow);
                    }

                    return true;
                };

                /**
                 * Indent a row within the legal bounds of the table.
                 *
                 * @param {number} indentDiff
                 *   The number of additional indentations proposed for the row (can be
                 *   positive or negative). This number will be adjusted to nearest valid
                 *   indentation level for the row.
                 *
                 * @return {number}
                 *   The number of indentations applied.
                 */
                Drupal.tableDrag.prototype.row.prototype.indent = function (indentDiff) {
                    var $group = $(this.group);
                    var prevRow = $(this.element).prev('tr').get(0);
                    var nextRow = $group.eq(-1).next('tr').get(0);

                    // Determine the valid indentations interval if not available yet.
                    if (!this.interval) {
                        this.interval = this.validIndentInterval(prevRow, nextRow);
                    }

                    // Adjust to the nearest valid indentation.
                    var indent = this.indents + indentDiff;
                    indent = Math.max(indent, this.interval.min);
                    indent = Math.min(indent, this.interval.max);
                    indentDiff = indent - this.indents;

                    if (indentDiff && !this.validIndent(prevRow, nextRow, indentDiff)) {
                        return false;
                    }

                    for (var n = 1; n <= Math.abs(indentDiff); n++) {
                        // Add or remove indentations.
                        if (indentDiff < 0) {
                            $group.find('.js-indentation:first-of-type').remove();
                            this.indents--;
                        }
                        else {
                            $group.find('td:first-of-type').prepend(Drupal.theme('tableDragIndentation'));
                            this.indents++;
                        }
                    }
                    if (indentDiff) {
                        // Update indentation for this row.
                        this.changed = true;
                        this.groupDepth += indentDiff;
                        this.onIndent();
                    }

                    return indentDiff;
                };


                /**
                 * Ensure that two rows are allowed to be swapped.
                 *
                 * @param {HTMLElement} row
                 *   DOM object for the row being considered for swapping.
                 *
                 * @return {boolean}
                 *   Whether the swap is a valid swap or not.
                 */
                Drupal.tableDrag.prototype.row.prototype.hasHierarchyChildren = function (row) {
                    var rowDepth = $(row).find('.js-indentation').length;
                    var pointer = row;
                    var hasChildren = false;

                    while (pointer) {
                        var currentDepth = $(pointer).find('.js-indentation').length;

                        if (currentDepth > rowDepth) {
                            hasChildren = true;
                            pointer = false;
                        }
                        else if (currentDepth === rowDepth) {
                            pointer = false;
                        }
                        else {
                            pointer = $(pointer).next('tr')[0];
                        }
                    }

                    return hasChildren;
                };

                /**
                 * Ensure that two rows are allowed to be swapped.
                 *
                 * @param {HTMLElement} row
                 *   DOM object for the row being considered for swapping.
                 *
                 * @return {boolean}
                 *   Whether the swap is a valid swap or not.
                 */
                Drupal.tableDrag.prototype.row.prototype.getHierarchyParent = function (row) {
                    var rowDepth = $(row).find('.js-indentation').length;
                    var pointer = row;
                    var parent = false;

                    while (pointer) {
                        var currentDepth = $(pointer).find('.js-indentation').length;

                        if (currentDepth < rowDepth && !parent) {
                            parent = pointer;
                        }

                        pointer = $(pointer).prev('tr')[0];
                    }

                    return parent;
                };

                /**
                 * Ensure that two rows are allowed to be swapped.
                 *
                 * @param {HTMLElement} row
                 *   DOM object for the row being considered for swapping.
                 *
                 * @return {boolean}
                 *   Whether the swap is a valid swap or not.
                 */
                Drupal.tableDrag.prototype.row.prototype.isValidSwap = function (row) {
                    var $row = $(row);
                    if (this.indentEnabled) {
                        var prevRow;
                        var nextRow;
                        if (this.direction === 'down') {
                            prevRow = row;
                            nextRow = $row.next('tr').get(0);
                        }
                        else {
                            prevRow = $row.prev('tr').get(0);
                            nextRow = row;
                        }

                        this.interval = this.validIndentInterval(prevRow, nextRow);
                        var prevRowDepth = $(prevRow).find('.js-indentation').length;
                        var ownRowDepth = this.indents;

                        if (!prevRow) {
                            return true;
                        }

                        if (ownRowDepth + 1 === prevRowDepth) {
                            var parent = this.getHierarchyParent(row);
                            return this.mayBeNestedInRow(parent);
                        }

                        if (ownRowDepth - 1 === prevRowDepth) {
                            return this.mayBeNestedInRow(prevRow);
                        }

                        if (ownRowDepth === prevRowDepth) {
                            var nextRowDepth = $(nextRow).find('.js-indentation').length;

                            // console.log(nextRowDepth, nextRow, this.hasHierarchyChildren(nextRow))

                            // console.log(prevRow)  && this.hasHierarchyChildren(prevRow)

                            if (!this.mayBeNestedInRow(prevRow)) {
                                return false;
                            }
                        }

                        var parent = this.getHierarchyParent(prevRow);

                        if (parent) {
                            return this.mayBeNestedInRow(parent);
                        }

                        // We have an invalid swap if the valid indentations interval is empty.
                        if (this.interval.min > this.interval.max) {
                            return false;
                        }
                    }

                    // Do not let an un-draggable first row have anything put before it.
                    if (this.table.tBodies[0].rows[0] === row && $row.is(':not(.draggable)')) {
                        return false;
                    }

                    return true;
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
