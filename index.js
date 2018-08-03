'use strict';

const Alexa = require('ask-sdk');
const DynamoDBAdapter = require('ask-sdk-dynamodb-persistence-adapter');

const TOSS_RESULT_HEADS = "It\'s Heads!";
const TOSS_RESULT_TAILS = "It\'s Tails!";


const LaunchRequestHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
	},
	handle( handlerInput) {
		const welcomeText = "Wanna Toss some COINS?! Just ask!";
		const repromptText = "You can ask me to flip a coin, try it out!";


		return handlerInput.responseBuilder
			.speak(welcomeText)
			.reprompt(repromptText)
			.withSimpleCard("Heads or Tails?", welcomeText)
			.getResponse();
	}
};


const TossCoinIntentHandler = {
	canHandle (handlerInput) {
		return handlerInput.requestEnvelope.request.type === "IntentRequest"
			&& handlerInput.requestEnvelope.request.intent.name === "TossCoin";
	},
	handle( handlerInput){
		let speechText = "Oops Something Bad Happened"
		//Basically rolling a dice and if it is Even, calling the Toss a Heads, else calling it Tails.
		let dice_roll = Math.floor((Math.random() * 100 + 1));
		let new_results = {heads : 0, tails : 0};
		let results_count = {};

		handlerInput.attributesManager.getPersistentAttributes()
			.then((attributes) => {
				results_count = attributes['result_count'] != undefined ? attributes['result_count'] : new_results;
				if( dice_roll % 2 == 0 ){
					results_count.heads += 1;
					speechText = TOSS_RESULT_HEADS;
				}
				else {
					results_count.tails += 1;
					speechText = TOSS_RESULT_TAILS;
				}

				handlerInput.attributesManager.setPersistentAttributes( results_count );
				return handlerInput.responseBuilder
					.speak(speechText)
					.withSimpleCard("The Results are in!", speechText)
					.getResponse();

			})
			.catch( (e) => {
				console.error(e);
				return handlerInput.responseBuilder
					.speak(speechText)
					.withSimpleCard("The Results are in!", speechText)
					.getResponse();
			});

	}
};


const HelpIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest'
			&& handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
	},
	handle( handlerInput) {
		const welcomeText = "Wanna Toss some COINS?! Just ask!";
		const repromptText = "You can ask me to flip a coin, try it out!";

		return handlerInput.responseBuilder
			.speak(welcomeText)
			.reprompt(repromptText)
			.withSimpleCard("Heads or Tails?", welcomeText)
			.getResponse();
	}
};



const CancelAndStopIntentHandler = {
	canHandle( handlerInput ){
		return handlerInput.requestEnvelope.request.type === 'IntentRequest'
			&& (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
				|| handlerInput.requestEnvelop.request.intent.name === 'AMAZON.StopIntent');
	},
	handle(handlerInput) {
		const speechText = "Aww, let's flip some more coins. Sad Face"

		return handlerInput.responseBuilder
			.speak( speechText )
			.withSimpleCard("Fun Time is over?", speechText)
			.getResponse();
	}
}


const SessionEndedRequestHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
	},
	handle(handlerInput) {
		//TODO: Remember to cleanup before you leave!
		return handlerInput.responseBuilder.getResponse();
	}
};

const ErrorHandler = {
	canHandle() {
		return true;
	},
	handle(handlerInput, error) {
		console.log(`Error handled: ${error.message}`);

		return handlerInput.responseBuilder
			.speak('Wait... did you just ask me to flip a coin?')
			.reprompt('I think I misheard, did you REALLY want to toss another coin?')
			.getResponse();
	},
};


/**
 * Doing the Lambda Function setup here
 *
 */

exports.handler = Alexa.SkillBuilders.standard()
	.addRequestHandlers(LaunchRequestHandler,
		TossCoinIntentHandler,
		HelpIntentHandler,
		CancelAndStopIntentHandler,
		SessionEndedRequestHandler)
	.addErrorHandlers(ErrorHandler)
	.withTableName('count-coin-toss')
	.withAutoCreateTable(true)
	.lambda();
