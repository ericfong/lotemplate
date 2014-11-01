Just require

    var lotemplate = require('lotemplate');

It will try to find the 'lotemplate' folder in the parent module.
All template file will resolve from that folder.


Usage:

    var msg = lotemplate({
        'subject': path.join('template-name', 'locale', 'email_subject.txt'),
        'text': path.join('template-name', 'locale', 'email_body.txt'),
    }, data);


It will look for templates file in the following order:

    ./lotemplate/template-name/locale/email_body.txt
    ./lotemplate/template-name/email_body.txt
    ./lotemplate/email_body.txt

Once found, render the template with data.

Do both for subject and text. Get back msg object with subject and text render outputs.
