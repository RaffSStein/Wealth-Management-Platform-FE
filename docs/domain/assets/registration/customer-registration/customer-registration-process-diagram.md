@startuml
actor FE as "Frontend (CRM/BO)"
participant "bank-service" as Bank
participant "user-service" as User
participant "email-service" as Reporting

activate FE
FE -> FE: User activates register.component
FE -> FE: User fills in country field
FE -> Bank: GET /branches\nretreive branches
activate Bank
Bank -> FE: 200 OK\nbranches list
deactivate Bank
FE -> FE: Filter branches by country
FE -> FE: User fills in branch field and role
FE -> FE: User fills in all fields
FE -> FE: User clicks "Register" button
FE -> User: POST /users\ncreate user
activate User
User -> User: Create user and return userId
User -> FE: 201 Created\ndisplay success message
User -> Reporting: POST /emails\nsend registration email
activate Reporting
Reporting -> Reporting: Generate and send activation email
Reporting -> User: 200 OK
deactivate Reporting
deactivate User
deactivate FE
@enduml
