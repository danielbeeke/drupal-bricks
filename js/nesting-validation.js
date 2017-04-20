(function ($, Drupal) {
    Drupal.behaviors.bricksNestingValidation = {
        attach: function (context, settings) {

            if (Drupal.tableDrag) {

                var getDepthOfRow = function (element) {
                    return parseInt($(element).find('.bricks-depth').val());
                };

                var mayNestByBundle = function (rowBundle, possibleParentBundle) {
                    return $.inArray(possibleParentBundle, settings.bricks.nesting[rowBundle]) !== -1;
                };

                /**
                 * Determine the valid indentations interval for the row at a given position.
                 *
                 * @param {?HTMLElement} prevRow
                 *   DOM object for the row before the tested position
                 *   (or null for first position in the table).
                 * @param {?HTMLElement} nextRow
                 *   DOM object for the row after the tested position
                 *   (or null for last position in the table).
                 *
                 * @return {object}
                 *   An object with the keys `min` and `max` to indicate the valid indent
                 *   interval.
                 */
                Drupal.tableDrag.prototype.row.prototype.validIndentInterval = function (prevRow, nextRow) {
                    var $prevRow = $(prevRow);
                    var minIndent;
                    var maxIndent;

                    // Minimum indentation:
                    // Do not orphan the next row.
                    minIndent = nextRow ? $(nextRow).find('.js-indentation').length : 0;

                    // Maximum indentation:
                    if (!prevRow || $prevRow.is(':not(.draggable)') || $(this.element).is('.tabledrag-root')) {
                        // Do not indent:
                        // - the first row in the table,
                        // - rows dragged below a non-draggable row,
                        // - 'root' rows.
                        maxIndent = 0;
                    }
                    else {
                        maxIndent = this.indents;
                        var realPrevRow = this.direction == 'up' ? nextRow : prevRow;

                        var thisRowDepth = getDepthOfRow(this.element);
                        var thisRowBundle = this.element.dataset.bundle;
                        var previousRows = $(realPrevRow).prevAll('tr').addBack().get().reverse();
                        var firstPreviousRow = previousRows[0];
                        var firstPreviousRowDepth = getDepthOfRow(firstPreviousRow);

                        // The row above the one that is dragged has the same depth.
                        if (thisRowDepth == firstPreviousRowDepth) {
                            maxIndent = this.indents + mayNestByBundle(thisRowBundle, firstPreviousRow.dataset.bundle);
                        }

                        // This row is nested under the one above.
                        else if (thisRowDepth > firstPreviousRowDepth) {
                            maxIndent = firstPreviousRowDepth;
                        }

                        // This row is nested under a parent of the above row.
                        else if (thisRowDepth < firstPreviousRowDepth) {
                            var trailRows = [];
                            var decremental = thisRowDepth + 1;

                            $(previousRows).each(function (delta, row) {
                                if (getDepthOfRow(row) <= thisRowDepth && getDepthOfRow(row) < decremental) {
                                    decremental--;
                                    trailRows.push(row);
                                }
                            });

                            var done = false;
                            $(trailRows).each(function (delta, row) {
                                if (!done && mayNestByBundle(thisRowBundle, row.dataset.bundle)) {
                                    done = true;
                                    maxIndent = getDepthOfRow(row) + 1;
                                }
                            });
                        }

                        // Limit by the maximum allowed depth for the table.
                        if (this.maxDepth) {
                            maxIndent = Math.min(maxIndent, this.maxDepth - (this.groupDepth - this.indents));
                        }
                    }

                    return {min: minIndent, max: maxIndent};
                };

            }

        }
    };
})(jQuery, Drupal);
