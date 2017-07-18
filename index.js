'use strict';

// Import petfinder module
var petfinder = require("petfinder").petfinder;

// Create a new `petfinder` object using the API key.
var pf = new petfinder("");


 /**
  * Implementation of the Lex Code Hook Interface
  * in order to serve a bot which finds pets to adopt.
  *
  */


 // --------------- Helpers to build responses which match the structure of the necessary dialog actions -----------------------

function elicitSlot(sessionAttributes, intentName, slots, slotToElicit, message) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'ElicitSlot',
            intentName,
            slots,
            slotToElicit,
            message,
        },
    };
}

function close(sessionAttributes, fulfillmentState, message) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'Close',
            fulfillmentState,
            message,
        },
    };
}

function delegate(sessionAttributes, slots) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'Delegate',
            slots,
        },
    };
}

// ---------------- Helper Functions --------------------------------------------------


function buildValidationResult(isValid, violatedSlot, messageContent) {
    if (messageContent == null) {
        return {
            isValid,
            violatedSlot,
        };
    }
    return {
        isValid,
        violatedSlot,
        message: { contentType: 'PlainText', content: messageContent },
    };
}

function validateFindPet(petType, sizeType, genderType) {
    const petTypes = ['dog', 'cat'];
    const sizeTypes = ['small', 'medium', 'large', 'extralarge'];
    const genderTypes = ['female', 'male'];

    if (petType && petTypes.indexOf(petType.toLowerCase()) === -1) {
        return buildValidationResult(false, 'PetType', `We do not have ${petType}, would you like a different kind of pet?  Our most popular pets are dogs`);
    }

    if (sizeType && sizeTypes.indexOf(sizeType.toLowerCase()) === -1) {
        return buildValidationResult(false, 'SizeType', `We do not have ${sizeType}, would you like a different size?  The sizes are small, medium, large and extralarge`);
    }

    if (genderType && genderTypes.indexOf(genderType.toLowerCase()) === -1) {
        return buildValidationResult(false, 'GenderType', `We do not have ${genderType}.  The gender types are female and male`);
    }

    return buildValidationResult(true, null, null);
}

 // --------------- Functions that control the bot's behavior -----------------------

/**
 * Performs dialog management and fulfillment for ordering flowers.
 *
 * Beyond fulfillment, the implementation of this intent demonstrates the use of the elicitSlot dialog action
 * in slot validation and re-prompting.
 *
 */
function findPet(intentRequest, callback) {
    const petType = intentRequest.currentIntent.slots.PetType;
    const sizeType = intentRequest.currentIntent.slots.SizeType;
    const genderType = intentRequest.currentIntent.slots.GenderType;
    const location = intentRequest.currentIntent.slots.City;
    const source = intentRequest.invocationSource;

    if (source === 'DialogCodeHook') {
        // Perform basic validation on the supplied input slots.  Use the elicitSlot dialog action to re-prompt for the first violation detected.
        const slots = intentRequest.currentIntent.slots;
        const validationResult = validateFindPet(petType, sizeType, genderType);
        if (!validationResult.isValid) {
            slots[`${validationResult.violatedSlot}`] = null;
            callback(elicitSlot(intentRequest.sessionAttributes, intentRequest.currentIntent.name, slots, validationResult.violatedSlot, validationResult.message));
            return;
        }

        // Initialize session attributes to be used in various prompts defined on the bot model.
        const outputSessionAttributes = intentRequest.sessionAttributes || {};

        callback(delegate(outputSessionAttributes, intentRequest.currentIntent.slots));
        return;
    }


    // Pet Gender
    var gender =  (genderType.toLowerCase() === 'male') ? "M":"F";

    // Pet Size
    var size = "";
        switch (sizeType.toLowerCase())
        {
        case "small":
            size = "S";
            break;
        case "medium":
            size = "M";
            break;
        case "large":
            size = "L";
            break;
        case "extralarge":
            size = "XL";
            break;
        default:
            size = "M";
        }

    // Get Random Pet
    pf.pet.getRandomPet(location, {"animal":petType,"size":size,"sex":gender}, function (data) {
    var myPet = data.petfinder.pet;
    
    var petInfo = "";
    var petId = myPet.id.$t;
    var petName = myPet.name.$t;
    var petGender = myPet.sex.$t;
    var petAge = myPet.age.$t;
    var petDescription = myPet.description.$t;
    var petPictures = "";

    var arrayLength = myPet.media.photos.photo.length;
        for (var i = 0; i < arrayLength; i++) {
            var tmpPic = myPet.media.photos.photo[i].$t;

            // Get the largest picture
            if (tmpPic.indexOf("x.jpg") !== -1){
                petPictures = tmpPic;
            }
        }

    // Prepare response
    petInfo = petInfo.concat("[",petId," | ",petName," | ",petGender," | ",petAge," | ",petDescription,"] ",petPictures);
    //console.log(petInfo);

    callback(close(intentRequest.sessionAttributes, 'Fulfilled',
        { contentType: 'PlainText', content: petInfo }));

    });
}

 // --------------- Intents -----------------------

/**
 * Called when the user specifies an intent for this skill.
 */
function dispatch(intentRequest, callback) {
    console.log(`dispatch userId=${intentRequest.userId}, intentName=${intentRequest.currentIntent.name}`);

    const intentName = intentRequest.currentIntent.name;

    // Dispatch to your skill's intent handlers
    if (intentName === 'FindPet') {
        return findPet(intentRequest, callback);
    }
    throw new Error(`Intent with name ${intentName} not supported`);
}

// --------------- Main handler -----------------------

// Route the incoming request based on intent.
// The JSON body of the request is provided in the event slot.
exports.handler = (event, context, callback) => {
    try {
        // By default, treat the user request as coming from the America/New_York time zone.
        process.env.TZ = 'America/New_York';
        console.log(`event.bot.name=${event.bot.name}`);

        /**
         * Uncomment this if statement and populate with your Lex bot name and / or version as
         * a sanity check to prevent invoking this Lambda function from an undesired Lex bot or
         * bot version.
         */

        if (event.bot.name !== 'PetFinder') {
             callback('Invalid Bot Name');
        }

        dispatch(event, (response) => callback(null, response));
    } catch (err) {
        callback(err);
    }
};
