// MySqlCommand.cs

using MySql;

namespace DevTrack.DAL.Repositories
{
    internal class MySqlCommand
    {
        private string query;
        private MySqlConnection connection;

        public MySqlCommand(string query, MySqlConnection connection)
        {
            this.query = query;
            this.connection = connection;
        }

        public MySqlCommand(string query, Data.MySqlClient.MySqlConnection connection1)
        {
            this.query = query;
        }

        public object Parameters { get; internal set; }

        internal async Task ExecuteNonQueryAsync()
        {
            throw new NotImplementedException();
        }

        internal async Task ExecuteReaderAsync()
        {
            throw new NotImplementedException();
        }
    }
}