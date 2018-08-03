'use strict';

const Alexa = require('ask-sdk');

const TOSS_RESULT_HEADS = "It\'s Heads!";
const TOSS_RESULT_TAILS = "It\'s Tails!";



function loadUserData(handlerInput) {
	return new Promise( (resolve, reject) => {
		let new_user_data = { results_count : { heads: 0, tails : 0 } };
		let user_data =	handlerInput.attributesManager.getSessionAttributes();
		if( user_data.results_count != undefined ){
			resolve(user_data);
		}
		else {

			handlerInput.attributesManager.getPersistentAttributes()
			.then((attributes) => {
				console.log("Persistent Attributes ",  attributes );
				user_data = attributes.results_count != undefined ? attributes : new_user_data;
				handlerInput.attributesManager.setSessionAttributes( user_data );
				console.log("Set Session Attributes", user_data);
				resolve( user_data);
			})
			.catch( (e) => {
				console.error(e);
				handlerInput.attributesManager.setSessionAttributes( new_user_data );
				reject( e );
			})
		}
	})
}

const LogIntentTypeHandler = {
	canHandle(handlerInput){
		console.log("Logging the Request");
		console.log(JSON.stringify( handlerInput.requestEnvelope.request ) );
		console.log("Logging session attributes");
		console.log(JSON.stringify(handlerInput.attributesManager.getSessionAttributes()));
		return false;
	},
	handle( handlerInput){
		return handlerInput.responseBuilder.getResponse();
	}

}

const NewSessionHandler = {
	canHandle(handlerInput){
		return  handlerInput.requestEnvelope.session.new; 
	},
	handle( handlerInput ){

		console.log("Started a New Session");
		loadUserData(handlerInput);
		return handlerInput.responseBuilder.getResponse();
		
	}
}

const LaunchRequestHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
	},
	handle( handlerInput) {

		console.log("New Launch Request received");
		const welcomeText = "Wanna Toss some COINS?! Just ask!";
		const repromptText = "You can ask me to flip a coin, try it out!";

		loadUserData(handlerInput);
		return handlerInput.responseBuilder
			.speak(welcomeText)
			.reprompt(repromptText)
			.withSimpleCard("Heads or Tails", welcomeText)
			.getResponse();

	}
};


const TossCoinIntentHandler = {
	canHandle (handlerInput) {
		return handlerInput.requestEnvelope.request.type === "IntentRequest"
			&& handlerInput.requestEnvelope.request.intent.name === "TossCoin";
	},
	async handle( handlerInput){
		let speechText = "Oops, Looks like the coin landed in the water."
		//Basically rolling a dice and if it is Even, calling the Toss a Heads, else calling it Tails.
		let dice_roll = Math.floor((Math.random() * 100 + 1));
		let user_data = await loadUserData( handlerInput );
		if( dice_roll % 2 == 0 ){
			user_data = {
				...user_data,
				results_count : {
					...user_data.results_count,
					heads : user_data.results_count.heads + 1
				}
			}
			speechText = TOSS_RESULT_HEADS;
		}
		else {

			user_data = {
				...user_data,
				results_count : {
					...user_data.results_count,
					tails : user_data.results_count.tails + 1
				}
			}

			speechText = TOSS_RESULT_TAILS;
		}

		handlerInput.attributesManager.setSessionAttributes( user_data );

		//TODO: Figure out LifeCycle Management and how a regular session ends
		await handlerInput.attributesManager.setPersistentAttributes(user_data);
		await handlerInput.attributesManager.savePersistentAttributes();
		
		return handlerInput.responseBuilder
			.speak(speechText)
			.withSimpleCard("The Results are in!", speechText)
			.getResponse();
	}
};

const CountResultsIntentHandler = {
	canHandle( handlerInput ){
		return handlerInput.requestEnvelope.request.type === "IntentRequest"
			&& handlerInput.requestEnvelope.request.intent.name === "CountResults";
	},
	async handle( handlerInput ) {
		let speechText = "1..2..3, having trouble counting, sorry";
		let user_data = await loadUserData( handlerInput);
		let requested_stat = handlerInput.requestEnvelope.request.intent.slots.result.value;
		/*
		console.log( "Requested Stat", requested_stat);
		console.log("Request Result", handlerInput.requestEnvelope.request.intent.slots.result);
		*/
		if( requested_stat != undefined && requested_stat.toLowerCase() === "tails" ){
			speechText = "You have had " + user_data.results_count.tails +" tails so far!";
		}
		else {
			speechText = "You have had " + user_data.results_count.heads + " heads so far!";
		}
		return handlerInput.responseBuilder
			.speak(speechText)
			.withSimpleCard("Your Stats", speechText)
			.getResponse();
	}

}


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
	async handle(handlerInput) {
		const speechText = "Aww, let's flip some more coins. Sad Face"
		//adding session data in to persistent Data at the end of the session.
		let user_data = handlerInput.attributesManager.getSessionAttributes()
		await handlerInput.attributesManager.savePersistentAttributes( user_data)
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
	async handle(handlerInput) {

		await handlerInput.attributesManager.savePersistentAttributes();
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
			.reprompt('Wait... did you just ask me to flip a coin?')
			.speak('Sorry, couldn\'t hear you amidst all these falling coins.')
			.getResponse();
	},
};


/**
 * Doing the Lambda Function setup here
 *
 */

exports.handler = Alexa.SkillBuilders.standard()
	.addRequestHandlers(
		LogIntentTypeHandler,
		LaunchRequestHandler,
		CountResultsIntentHandler,
		TossCoinIntentHandler,
		HelpIntentHandler,
		CancelAndStopIntentHandler,
		NewSessionHandler,
		SessionEndedRequestHandler)
	.addErrorHandlers(ErrorHandler)
	.withTableName('count-coin-toss')
	.withAutoCreateTable(true)
	.lambda();
