'use strict';

const Alexa = require('ask-sdk');

const STRINGS =  require('strings.js').STRINGS;


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


/* Simple Function to log the Intent Type that is received by the skill
 * Put this is in here to understand the event flow and check if it is working as expected"
 */
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
		const welcomeText = STRINGS.WELCOME_MESSAGE;
		const repromptText = STRINGS.WELCOME_REPROMPT;

		loadUserData(handlerInput);
		return handlerInput.responseBuilder
			.speak(welcomeText)
			.reprompt(repromptText)
			.withSimpleCard(STRINGS.WELCOME_SIMPLE_TITLE, welcomeText)
			.getResponse();

	}
};


const TossCoinIntentHandler = {
	canHandle (handlerInput) {
		return handlerInput.requestEnvelope.request.type === "IntentRequest"
			&& handlerInput.requestEnvelope.request.intent.name === "TossCoin";
	},
	async handle( handlerInput){
		let speechText = STRINGS.TOSS_COIN_DEFAULT;
		//Basically rolling a dice and if it is Even, calling the Toss a Heads, else calling it Tails.
		let dice_roll = Math.floor((Math.random() * 100 + 1));
		let user_data = await loadUserData( handlerInput );
		//updating user_data with the new count for the result
		if( dice_roll % 2 == 0 ){
			user_data = {
				...user_data,
				results_count : {
					...user_data.results_count,
					heads : user_data.results_count.heads + 1
				}
			}
			speechText = STRINGS.TOSS_RESULT_HEADS[ dice_roll % STRINGS.TOSS_RESULT_HEADS.length ];
		}
		else {

			user_data = {
				...user_data,
				results_count : {
					...user_data.results_count,
					tails : user_data.results_count.tails + 1
				}
			}

			speechText = STRINGS.TOSS_RESULT_TAILS[ dice_roll % STRINGS.TOSS_RESULT_TAILS.length ];
		}

		handlerInput.attributesManager.setSessionAttributes( user_data );

		await handlerInput.attributesManager.setPersistentAttributes(user_data);
		await handlerInput.attributesManager.savePersistentAttributes();
		
		return handlerInput.responseBuilder
			.speak(speechText)
			.withSimpleCard( STRINGS.TOSS_COIN_SIMPLE_TITLE, speechText)
			.reprompt( STRINGS.TOSS_COIN_REPROMPT )
			.withShouldEndSession(false)
			.getResponse();
	}
};

const CountResultsIntentHandler = {
	canHandle( handlerInput ){
		return handlerInput.requestEnvelope.request.type === "IntentRequest"
			&& handlerInput.requestEnvelope.request.intent.name === "CountResults";
	},
	async handle( handlerInput ) {
		let speechText = STRINGS.COUNT_RESULTS_DEFAULT;
		let user_data = await loadUserData( handlerInput);
		let requested_stat = handlerInput.requestEnvelope.request.intent.slots.result.value;
		/*
		console.log( "Requested Stat", requested_stat);
		console.log("Request Result", handlerInput.requestEnvelope.request.intent.slots.result);
		*/
		//TODO: Match the resolution value instead of the actual value to respond better
		if( requested_stat != undefined && requested_stat.toLowerCase() === "tails" ){
			speechText = "You have landed " + user_data.results_count.tails +" tails so far!";
		}
		else if(( requested_stat != undefined) && requested_stat.toLowerCase() == "heads") {
			speechText = "You have landed " + user_data.results_count.heads + " heads so far!";
		}
		else if( (requested_stat != undefined) && (requested_stat.toLowerCase() == "all" ) ){
			speechText = "You have landed " + user_data.results_count.heads + " Heads and "
				+ user_data.results_count.tails + " Tails so far."
		}
		return handlerInput.responseBuilder
			.speak(speechText)
			.withSimpleCard( STRINGS.COUNT_RESULTS_SIMPLE_TITLE, speechText)
			.getResponse();
	}

}


const HelpIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest'
			&& handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
	},
	handle( handlerInput) {
		const welcomeText = STRINGS.WELCOME_SPEECH;
		const repromptText = STRINGS.WELCOME_REPROMPT;

		return handlerInput.responseBuilder
			.speak(welcomeText)
			.reprompt(repromptText)
			.withSimpleCard(STRINGS.WELCOME_SIMPLE_TEXT, welcomeText)
			.withShouldEndSession(false)
			.getResponse();
	}
};

/*
 * When a Cancel or Stop intent is received, making sure to save the session attributes to persistent store.
 */
const CancelAndStopIntentHandler = {
	canHandle( handlerInput ){
		return handlerInput.requestEnvelope.request.type === 'IntentRequest'
			&& (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
				|| handlerInput.requestEnvelop.request.intent.name === 'AMAZON.StopIntent');
	},
	async handle(handlerInput) {
		const speechText = STRINGS.EXIT_SPEECH;
		//adding session data in to persistent Data at the end of the session.
		let user_data = handlerInput.attributesManager.getSessionAttributes()
		await handlerInput.attributesManager.setPersistentAttributes(user_data);
		await handlerInput.attributesManager.savePersistentAttributes()
		return handlerInput.responseBuilder
			.speak( speechText )
			.withSimpleCard(STRINGS.EXIT_SIMPLE_TITLE, speechText)
			.getResponse();

	}
}

/* 
 * At the end of session, persisting the sessionAttribute to persistent store
 */
const SessionEndedRequestHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
	},
	async handle(handlerInput) {
		
		let user_data = handlerInput.attributesManager.getSessionAttributes()
		await handlerInput.attributesManager.setPersistentAttributes(user_data);
		await handlerInput.attributesManager.savePersistentAttributes()
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
			.speak(STRINGS.ERROR_SPEECH)
			.reprompt(STRINGS.ERROR_REPROMPT)
			.withShouldEndSession(false)
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
