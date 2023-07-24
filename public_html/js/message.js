/*globals jQuery:false STAY_ON_SITE:false */
(function(localScopeObj, $) {
	"use strict";
	const $visibleMessage = $('input.messageGroup[aria-label="visibleMessage"]:first');
	const $titleMessage = $('input.messageGroup[aria-label="titleMessage"]:first');
	localScopeObj.createTeamsMessage = function() {
		let visibleMessageValue = $visibleMessage.val();
		let titleMessageValue = $titleMessage.val();
		$titleMessage.next('div').remove();
		let $newMessageHolder = $("<div>");
		let $newMessage = $("<p>", {
			style: "font-size: 13px;text-align-last: left;",
			title: titleMessageValue,
			text: visibleMessageValue
		});
		$newMessageHolder.prepend($newMessage);
		$newMessageHolder.prepend("\u00A0");
		$newMessageHolder.append("\u00A0");
		$newMessageHolder.insertAfter($titleMessage);
	};
	$(document).ready(function () {
		$("button.messageGroup:first").on("click", this.messageGroup.createTeamsMessage);
	});
})(this.messageGroup = this.messageGroup || {}, jQuery)
//# sourceURL=message.js