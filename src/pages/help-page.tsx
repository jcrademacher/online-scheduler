import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { faCircleExclamation } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';
import { Container, Card, Accordion, Table } from 'react-bootstrap';

const HelpPage: React.FC = () => {
  return (
    <Container className="py-4">
      <h1 className="mb-4">Help & Documentation</h1>
      
      <Card className="mb-4">
        <Card.Body>
          <Card.Title>Welcome to the RYLA Scheduler</Card.Title>
          <Card.Text>
            This application helps you create, manage, analyze, and export RYLA schedules efficiently. Below you'll find information on how to use the various features.
          </Card.Text>
        </Card.Body>
      </Card>

      <Accordion defaultActiveKey="0" className="mb-4">
        <Accordion.Item eventKey="0">
          <Accordion.Header>Getting Started</Accordion.Header>
          <Accordion.Body>
            <h5>Creating a New Schedule</h5>
            <ol>
              <li>Click on the "File" menu in the navigation bar</li>
              <li>Select "New" to create a new schedule</li>
              <li>Enter a name for your schedule</li>
              <li>Set the start and end dates</li>
              <li>Configure the number of legs if needed</li>
              <li>Click "Create" to generate your new schedule</li>
            </ol>

            <h5>Opening an Existing Schedule</h5>
            <ol>
              <li>Click on the "File" menu in the navigation bar</li>
              <li>Select "Open" to view your saved schedules</li>
              <li>Click on the schedule you want to open</li>
            </ol>
          </Accordion.Body>
        </Accordion.Item>

        <Accordion.Item eventKey="1">
          <Accordion.Header>Creating Activity Prototypes</Accordion.Header>
          <Accordion.Body>
            <p>
                Activity prototypes are the activities that legs may be scheduled to do over the course of camp. 
                They are called "prototypes" because they are the blueprints for the individual activities that will be scheduled at specific times for specific legs. 
                For example: Leighton's Leap, Gagne's Gateway, or Ethics. 
                <br/><br/>
                Prototypes are specific to individual schedules, and thus must be created for each new schedule. 
                This allows the user to specify different analyzer settings for the same activity on different schedules. <strong>You must create these prototypes before legs can be scheduled on them.</strong>
            </p>
            <ol>
              <li>Navigate to Settings in the top right corner after creating a new schedule</li>
              <li>Click "Activity Prototypes" on the left sidebar in the dialog that appears</li>
              <li>Fill in the required details in the top row of the table:
                <ul>
                  <li>Name: A descriptive name for the activity</li>
                  <li>Duration: How long the activity lasts (in hours)</li>
                  <li>Type: The category of the activity (Element or Program). This only affects the color of the activity in the header of the schedule</li>
                  <li>Zone: The zone of Camp Hinds where the activity takes place. Currently, there are only three zones: Ridge, Waterfront, and Central.
                    <ul>
                      <li>Ridge: The ridge at Camp Hinds, also known as the low COPES course. Activities here may include Tire Traverse or Moby Deck.</li>
                      <li>Waterfront: The waterfront at Camp Hinds. Activities here may include Trolleys or Water Program</li>
                      <li>Central: The central area of Camp Hinds, including near the dining hall, tabor, and the crafts shop.
                        Activities here may include Blind Maze, Escape Room, or Ethics.
                      </li>
                    </ul>
                  </li>
                  <li>Required: Check this box if the activity <strong>must</strong> be completed by all legs at some point during the schedule.
                  </li>
                  <li>Group Size: Number of legs that must do this activity simultaneously (for example, See Saw or Community Build should be set to a group size of 2)</li>
                  <li>Preferred Days: The days of the schedule when this activity should be scheduled.</li>
                </ul>
              </li>
              <li>Click "Save" to create the prototype. The prototype will appear in as a column in the schedule.</li>
            </ol>
          </Accordion.Body>
        </Accordion.Item>

        <Accordion.Item eventKey="1.5">
          <Accordion.Header>Adding Activities to the Schedule</Accordion.Header>
          <Accordion.Body>
            <h5>Creating Activities</h5>
            <p>
              Once you've created activity prototypes, you can schedule two types of activities: leg-specific and global activities.
            </p>
            <h6>Leg-Specific Activities</h6>
            Leg-specific activities are individual instances of an activity prototype that are scheduled for a specific leg at a specific time.
            <ol>
              <li>Find an empty time slot in the schedule grid</li>
              <li>Click on the empty box to create a leg-specific activity.</li>
              <li>Enter the leg number in the dialog that appears. There may be multiple dialog boxes for activity protoypes with group sizes greater than 1.</li>
              <li>Confirm your selection to add the activity to that specific time slot for that leg.</li>
            </ol>
            The duration of the activity (i.e., the number of time slots it spans) is fixed by the duration specified in the activity prototype created in the previous step. 
            If clicking an empty time slot does not create an activity, it means that the activity cannot fit in the time slot.  
            <br/><br/>
            <h6>Global Activities</h6>
            Global activities are activities that are scheduled for all legs at the same time. For example, meals or camp-wide events like SOLOs or campfires.
            <ol>
              <li>Find a set of time slots that are empty for all activity prototypes in the schedule (i.e., an empty row in the schedule grid)</li>
              <li>Click on an empty cell and hold the mouse button down</li>
              <li>Drag across multiple time slots or rows to select a range. Your selection will be highlighted in light blue.</li>
              <li>Release the mouse button. A global activity will be created in all selected time slots.</li>
              <li>Enter the name of the global activity in the dialog that appears. You may also select a color from the color palette.</li>
            </ol>
            
            <p>
              <strong>Note:</strong> You can only add activities to the schedule if you have first created the corresponding activity prototypes in the Settings.
            </p>
          </Accordion.Body>
        </Accordion.Item>

        <Accordion.Item eventKey="2">
          <Accordion.Header>Schedule Analysis</Accordion.Header>
          <Accordion.Body>
            <p>This scheduler provides an analysis tool to help you optimize the schedule. The analysis lists information, warnings, and errors
                according to certain rules about the content and sequence of activities in the schedule. 
                The analysis is dependent on certain settings of the activity prototypes you create, thus its behavior can be tuned by changing these settings.
                These rules are as follows: 
            </p>
            <ul>
              <Table bordered>
                <thead>
                  <tr>
                    <th>Rule</th>
                    <th>Description</th>
                    <th>Prototype Settings(s)</th>
                    <th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Repetition</td>
                    <td>A leg must not attend the same activity twice. This does not apply to global activities. 
                        The analysis will raise errors for each instance of a leg repeating an activity more than once. This rule is not affected by any prototype settings.</td>
                    <td>N/A</td>
                    <td><FontAwesomeIcon icon={faCircleExclamation} className="text-danger" /> Error</td>
                  </tr>
                  <tr>
                    <td>Double Booking</td>
                    <td>A leg must only attend one activity at a time. The leg must complete the full duration of the activity before it can attend another one.
                        This rule is not affected by any prototype settings.
                    </td>
                    <td>N/A</td>
                    <td><FontAwesomeIcon icon={faCircleExclamation} className="text-danger" /> Error</td>
                  </tr>
                  <tr>
                    <td>Requirement</td>
                    <td>Every leg must attend a required activity once. Examples may include Gagne's Gateway or Community Build. The analysis will raise errors 
                        for each leg that does not attend an activity whose prototype has "Required?" checked. 
                        Note that the prototype "type" setting (Element or Program) does not affect this rule. 
                    </td>
                    <td>"Required?"</td>
                    <td><FontAwesomeIcon icon={faCircleExclamation} className="text-danger" /> Error</td>
                  </tr>
                  <tr>
                    <td>Travel Time</td>
                    <td>Checks for sufficient travel time between activities. 
                        An estimate is computed (in minutes) of how long each leg must travel between zones across all the activities they attend. 
                        If the leg must travel a long distance in between any two activities (say between the Waterfront and the Ridge), the analysis will raise a warning. 
                        The analysis will also tell you the average travel time for each leg across the schedule. 
                    </td>
                    <td>"Zone"</td>
                    <td><FontAwesomeIcon icon={faTriangleExclamation} className="text-warning" /> Warning</td>
                  </tr>
                  <tr>
                    <td>Preferred Days</td>
                    <td>Verifies activities are scheduled on their preferred days.
                        The analysis will raise warnings for each instance of an activity being scheduled for any leg on a day that is not in the "Preferred Days" list
                        of the activity prototype.
                    </td>
                    <td>"Preferred Days"</td>
                    <td><FontAwesomeIcon icon={faTriangleExclamation} className="text-warning" /> Warning</td>
                  </tr>
                  <tr>
                    <td>Free Time</td>
                    <td>Evaluates how much free time (in hours) each leg has in their schedule. 
                        If the number of free time hours exceeds 2 (or 4 thirty-minute time slots), the analysis will raise a warning.
                    </td>
                    <td>None</td>
                    <td><FontAwesomeIcon icon={faTriangleExclamation} className="text-warning" /> Warning</td>
                  </tr>
                </tbody>
              </Table>
            </ul>
            <p>To run an analysis, open the Analysis pane in the top right corner and click the "Run" button. </p>
          </Accordion.Body>
        </Accordion.Item>

        <Accordion.Item eventKey="3">
          <Accordion.Header>Tips and Troubleshooting</Accordion.Header>
          <Accordion.Body>
            <h5>Best Practices</h5>
            <ul>
              <li>Create activity prototypes before building your schedule</li>
              <li>Regularly save your work</li>
              <li>Run analyses frequently to catch potential issues early</li>
            </ul>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>

      <Card>
        <Card.Body>
          <Card.Title>Need More Help?</Card.Title>
          <Card.Text>
            If you have questions that aren't addressed here, please contact Jack at <a href={`mailto:${import.meta.env.VITE_EMAIL}`}>{import.meta.env.VITE_EMAIL}</a>
          </Card.Text>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default HelpPage;
