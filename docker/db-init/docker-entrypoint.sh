#!/bin/bash

#WAIT_TIME
echo  "Waiting for couchdb to start"
WAIT_TIME=0
until curl couchdb:5984 || [ $WAIT_TIME -eq 180 ]; do
    echo "..."
    sleep 5
    WAIT_TIME=$(expr $WAIT_TIME + 5)
done

#CORS SETUP
add-cors-to-couchdb http://couchdb:5984

#MIGRATOR
curl -X PUT http://couchdb:5984/_users
curl -X PUT http://couchdb:5984/_replicator
curl -X PUT http://couchdb:5984/_global_changes
curl -X PUT http://couchdb:5984/meetups
curl -X PUT http://couchdb:5984/courses
curl -X PUT http://couchdb:5984/courses/_design/course-validators -d @../../design/courses/course-validators.json
