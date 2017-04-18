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

                var getMaxIndentForType = function (element, prevRow, nextRow) {
                    var rowBundle = element.dataset.bundle;
                    var prevRows = [prevRow].concat($(prevRow).prevAll('tr').get());

                    var branchRows = [];
                    var done = false;

                    $(prevRows).each(function(delta, row) {
                        if (!done && row != element) {
                            branchRows.push(row);
                            done = getDepthOfRow(row) == 0;
                        }
                    });

                    branchRows = branchRows.reverse();

                    done = false;

                    var maxDepth = 0;
                    $(branchRows).each(function (delta, row) {
                        if (!done && mayNestByBundle(rowBundle, row.dataset.bundle)) {
                            maxDepth = getDepthOfRow(row) + 1;
                        }
                        else if (!done && !mayNestByBundle(rowBundle, row.dataset.bundle)) {
                            maxDepth = getDepthOfRow(row);
                        }
                        else {
                            done = true;
                        }
                    });

                    if (getDepthOfRow(prevRow) + 1 < maxDepth) {
                        maxDepth = getDepthOfRow(prevRow) + 1;
                    }

                    if (!branchRows.length) {
                        maxDepth = 1;
                    }

                    return maxDepth;
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
                        // Do not go deeper than as a child of the previous row.
                        maxIndent = getMaxIndentForType(this.element, prevRow, nextRow);
                        // maxIndent = $prevRow.find('.js-indentation').length + ($prevRow.is('.tabledrag-leaf') ? 0 : 1);

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
