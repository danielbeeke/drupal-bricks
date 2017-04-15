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

                var getParent = function (element) {
                    var initialDepth = getDepthOfRow(element);
                    element = $(element).prev('tr')[0];

                    while (getDepthOfRow(element) > initialDepth - 1 && $(element).length) {
                        element = $(element).prev('tr')[0];
                    }

                    return element;
                };

                var getFirstSibling = function (element) {
                    var initialDepth = getDepthOfRow(element);
                    element = $(element).prev('tr')[0];

                    while (getDepthOfRow(element) >= initialDepth + 1 && $(element).length) {
                        element = $(element).prev('tr')[0];
                    }

                    return element;
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
                    var parentRow = getParent(this.element);
                    var siblingRow = getFirstSibling(this.element);

                    var $prevRow = $(prevRow);
                    var minIndent;
                    var maxIndent;

                    var currentBundle = this.element.dataset.bundle;
                    var prevBundle = prevRow ? prevRow.dataset.bundle : false;
                    var parentBundle = parentRow ? parentRow.dataset.bundle : false;
                    var siblingBundle = siblingRow ? siblingRow.dataset.bundle : false;

                    var currentDepth = getDepthOfRow(this.element);
                    var prevDepth = getDepthOfRow(prevRow);
                    var parentDepth = getDepthOfRow(parentRow);
                    var siblingDepth = getDepthOfRow(siblingRow);

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
                        maxIndent = $prevRow.find('.js-indentation').length + ($prevRow.is('.tabledrag-leaf') ? 0 : 1);

                        // Validate the previous row.
                        if (!mayNestByBundle(currentBundle, prevBundle) && prevDepth == currentDepth) {
                            maxIndent = this.indents;
                        }

                        // TODO this may need more recursive like code.
                        if (prevDepth == currentDepth + 1) {
                            if (mayNestByBundle(currentBundle, getParent(prevRow).dataset.bundle)) {
                                maxIndent = this.indents + 1;
                            }
                            else {
                                maxIndent = this.indents;
                            }
                        }

                        if (!mayNestByBundle(currentBundle, siblingBundle) && siblingDepth == currentDepth) {
                            maxIndent = this.indents;
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
